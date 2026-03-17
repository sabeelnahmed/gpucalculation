import gpuCatalog from '../../gpu_catalog_complete.json'
import comparisonData from '../../comparision_data.json'

// ── Extract all GPUs from tiered catalog ──

const tierKeys = ['tier_1_consumer', 'tier_2_workstation', 'tier_3_datacenter_inference', 'tier_4_datacenter_flagship']

export const allGPUs = []
tierKeys.forEach(tier => {
  const tierData = gpuCatalog[tier]
  if (!tierData?.gpus) return
  const tierLabel = tierData._description?.split('—')[0]?.trim() || tier
  Object.entries(tierData.gpus).forEach(([id, gpu]) => {
    allGPUs.push({ id, tierKey: tier, tierLabel, ...gpu })
  })
})

// ── Currency ──

export const currencyRates = {
  USD: { symbol: '$', rate: 1, name: 'US Dollar' },
  SAR: { symbol: 'SAR', rate: 3.75, name: 'Saudi Riyal' },
  EUR: { symbol: '€', rate: 0.92, name: 'Euro' },
  GBP: { symbol: '£', rate: 0.79, name: 'British Pound' },
  AED: { symbol: 'AED', rate: 3.67, name: 'UAE Dirham' },
  INR: { symbol: '₹', rate: 83.50, name: 'Indian Rupee' },
}

export function formatCurrency(usdAmount, code = 'SAR') {
  const c = currencyRates[code] || currencyRates.SAR
  const v = usdAmount * c.rate
  if (v >= 1e6) return `${c.symbol} ${(v / 1e6).toFixed(1)}M`
  if (v >= 1000) return `${c.symbol} ${Math.round(v).toLocaleString()}`
  return `${c.symbol} ${v.toFixed(2)}`
}

// ── Constants ──

const bytesPerParam = { fp16: 2, int8: 1, int4: 0.5 }

const defaultTPS = {
  chatbot: 20, knowledge: 15, summarization: 10, code: 20,
  compliance: 10, arabic: 20, batch: 5, custom: 15,
}

export { defaultTPS, comparisonData }

// ── Calculation Engine ──

export function calculateAll(params) {
  const {
    model, precision = 'int8', contextLength = 4096, concurrentUsers = 10,
    requestsPerDay = 25, targetTPS = 15, deployment = 'onpremise',
    monthlyHours = 730, useCase = 'custom',
  } = params

  if (!model?.params_billion) return null

  const prec = precision.toLowerCase()
  const bpp = bytesPerParam[prec] || 1

  // Step 1: Weight memory
  const weightGB = model.params_billion * bpp

  // Step 2: KV cache
  const numLayers = model.num_layers || 32
  const numAttnHeads = model.num_attention_heads || 32
  const headDim = model.head_dim || Math.floor((model.hidden_dim || 4096) / numAttnHeads)
  const kvHeads = model.num_kv_heads || numAttnHeads
  const kvBytesPerToken = 2 * numLayers * kvHeads * headDim * 2
  const kvPerUserGB = (kvBytesPerToken * contextLength) / (1024 ** 3)
  const kvTotalGB = kvPerUserGB * concurrentUsers

  // Step 3: Total VRAM
  const overheadGB = 2
  const totalVRAMNeeded = weightGB + kvTotalGB + overheadGB

  // Step 4: Evaluate every GPU
  const gpuResults = []

  allGPUs.forEach(gpu => {
    const vram = gpu.vram_gb
    if (!vram) return

    const bw = gpu.memory_bandwidth_gb_s || 0
    if (bw === 0) return

    // Parse purchase price
    let unitPrice = 0
    const pp = gpu.purchase_price_usd
    if (pp) {
      if (pp.mid) unitPrice = pp.mid
      else if (pp.msrp) unitPrice = pp.msrp
      else if (pp.estimated) unitPrice = parseFloat(pp.estimated) || 0
      else if (pp.street_2026) {
        const m = String(pp.street_2026).match(/(\d+)/)
        unitPrice = m ? parseInt(m[1]) : 0
      }
      else if (pp.low) unitPrice = pp.low
    }

    const tpGPUs = Math.ceil(weightGB / vram)
    const hasNvlink = gpu.nvlink === true
    if (tpGPUs > 1 && !hasNvlink && tpGPUs > 2) {
      gpuResults.push({ gpuId: gpu.id, gpuName: gpu.name, gpuTier: gpu.tierLabel, gpuVRAM: vram, architecture: gpu.architecture, infeasible: true, reason: `Needs ${tpGPUs} GPUs without NVLink. PCIe parallelism beyond 2 GPUs impractical.`, unitPriceUSD: unitPrice })
      return
    }
    if (tpGPUs > 8) {
      gpuResults.push({ gpuId: gpu.id, gpuName: gpu.name, gpuTier: gpu.tierLabel, gpuVRAM: vram, architecture: gpu.architecture, infeasible: true, reason: `Would require ${tpGPUs}+ GPUs for tensor parallelism — exceeds practical limit.`, unitPriceUSD: unitPrice })
      return
    }

    const weightPerGPU = weightGB / tpGPUs
    const availableKVPerGPU = vram - weightPerGPU - 0.5
    if (availableKVPerGPU <= 0) {
      gpuResults.push({ gpuId: gpu.id, gpuName: gpu.name, gpuTier: gpu.tierLabel, gpuVRAM: vram, architecture: gpu.architecture, infeasible: true, reason: `Needs ${weightGB.toFixed(0)} GB, only ${vram} GB per GPU. No room for KV cache.`, unitPriceUSD: unitPrice })
      return
    }

    const maxUsersPerTPGroup = Math.max(1, Math.floor((availableKVPerGPU * tpGPUs) / Math.max(kvPerUserGB, 0.001)))
    const numReplicas = Math.ceil(concurrentUsers / maxUsersPerTPGroup)
    const totalGPUs = tpGPUs * numReplicas

    if (totalGPUs > 16) {
      gpuResults.push({ gpuId: gpu.id, gpuName: gpu.name, gpuTier: gpu.tierLabel, gpuVRAM: vram, architecture: gpu.architecture, infeasible: true, reason: `Would require ${totalGPUs} GPUs — exceeds practical single-deployment limit.`, unitPriceUSD: unitPrice })
      return
    }

    // Throughput
    const modelWeightBytes = model.params_billion * 1e9 * bpp
    const singleUserTPS = (bw * 1e9) / modelWeightBytes
    const parallelEff = hasNvlink ? 0.9 : 0.65
    const effectiveTPS = Math.round(singleUserTPS * (tpGPUs > 1 ? parallelEff : 1))

    let latencyRating, latencyLabel
    if (effectiveTPS >= 40) { latencyRating = 'excellent'; latencyLabel = 'Premium experience' }
    else if (effectiveTPS >= 20) { latencyRating = 'good'; latencyLabel = 'Smooth' }
    else if (effectiveTPS >= 10) { latencyRating = 'acceptable'; latencyLabel = 'Usable' }
    else { latencyRating = 'poor'; latencyLabel = 'Laggy' }

    const totalPriceUSD = unitPrice * totalGPUs
    const tdp = gpu.tdp_watts || 300
    const monthlyPowerKWH = (tdp * totalGPUs * 1.4 * 730) / 1000
    const monthlyPowerUSD = monthlyPowerKWH * 0.048 / 3.75
    const totalVRAMAvailable = vram * totalGPUs
    const vramUtil = Math.round((totalVRAMNeeded / totalVRAMAvailable) * 100)

    gpuResults.push({
      gpuId: gpu.id, gpuName: gpu.name, gpuTier: gpu.tierLabel, gpuVRAM: vram,
      architecture: gpu.architecture, totalGPUs, tpGPUs, numReplicas,
      totalVRAMAvailable, totalVRAMUsed: Math.round(totalVRAMNeeded * 10) / 10,
      vramUtilization: vramUtil, maxUsersPerTPGroup, maxUsersTotal: maxUsersPerTPGroup * numReplicas,
      effectiveTPS, latencyRating, latencyLabel, meetsTarget: effectiveTPS >= targetTPS,
      unitPriceUSD: unitPrice, totalPriceUSD,
      tdpWatts: tdp, monthlyPowerUSD,
      powerBreakdown: `${tdp}W × ${totalGPUs} GPU × 1.4 PUE × 730hrs`,
      gpu, infeasible: false,
    })
  })

  // Sort feasible first by price
  const feasible = gpuResults.filter(r => !r.infeasible).sort((a, b) => {
    if (a.meetsTarget && !b.meetsTarget) return -1
    if (!a.meetsTarget && b.meetsTarget) return 1
    return a.totalPriceUSD - b.totalPriceUSD
  })
  const infeasible = gpuResults.filter(r => r.infeasible)

  // Badges
  if (feasible.length > 0) {
    const meetTarget = feasible.filter(r => r.meetsTarget)
    if (meetTarget.length > 0) {
      meetTarget[0]._badge = 'best_value'
      const fastest = [...meetTarget].sort((a, b) => b.effectiveTPS - a.effectiveTPS)[0]
      if (fastest.gpuId !== meetTarget[0].gpuId) fastest._badge = 'fastest'
    } else {
      feasible[0]._badge = 'best_value'
    }
  }

  // API costs
  const avgTokens = comparisonData._metadata.avg_tokens_by_use_case[useCase] || { input: 2000, output: 500 }
  const monthlyInputTokens = concurrentUsers * requestsPerDay * 30 * avgTokens.input
  const monthlyOutputTokens = concurrentUsers * requestsPerDay * 30 * avgTokens.output

  const apiResults = []
  Object.entries(comparisonData.api_providers).forEach(([key, provider]) => {
    if (key.startsWith('_') || !provider?.models) return
    Object.entries(provider.models).forEach(([modelId, apiModel]) => {
      const cost = (monthlyInputTokens / 1e6 * apiModel.input_per_million) + (monthlyOutputTokens / 1e6 * apiModel.output_per_million)
      apiResults.push({
        id: modelId, name: apiModel.name, provider: provider.provider_name,
        providerColor: provider.provider_color, dataResidency: provider.data_residency,
        inputRate: apiModel.input_per_million, outputRate: apiModel.output_per_million,
        tier: apiModel.tier, monthlyCostUSD: cost,
      })
    })
  })
  apiResults.sort((a, b) => a.monthlyCostUSD - b.monthlyCostUSD)

  // Best value GPU
  const bestValue = feasible.find(r => r._badge === 'best_value')

  // Self-hosted monthly = amortized purchase (over 36 months) + power
  const selfHostedMonthlyUSD = bestValue
    ? (bestValue.totalPriceUSD / 36) + bestValue.monthlyPowerUSD
    : 0

  // Cloud GPU costs — for each provider, find cheapest feasible GPU they offer
  const cloudResults = []
  Object.entries(comparisonData.cloud_gpu_providers).forEach(([providerId, provider]) => {
    if (providerId.startsWith('_') || !provider?.hourly_rates) return

    let cheapest = null
    feasible.forEach(gpu => {
      const rate = provider.hourly_rates?.[gpu.gpuId]
      if (!rate) return
      const monthlyCost = rate * gpu.totalGPUs * monthlyHours
      if (!cheapest || monthlyCost < cheapest.monthlyCostUSD) {
        cheapest = {
          id: providerId, name: provider.name, displayName: provider.display_name,
          brandColor: provider.brand_color, dataResidency: provider.data_residency,
          saudiRegion: provider.saudi_region, hourlyRate: rate,
          gpuCount: gpu.totalGPUs, gpuName: gpu.gpuName, gpuId: gpu.gpuId,
          monthlyCostUSD: monthlyCost,
        }
      }
    })
    if (cheapest) cloudResults.push(cheapest)
  })
  cloudResults.sort((a, b) => a.monthlyCostUSD - b.monthlyCostUSD)

  return {
    weightGB: Math.round(weightGB * 10) / 10,
    kvTotalGB: Math.round(kvTotalGB * 10) / 10,
    kvPerUserGB: Math.round(kvPerUserGB * 1000) / 1000,
    overheadGB, totalVRAMNeeded: Math.round(totalVRAMNeeded * 10) / 10,
    feasible, infeasible, bestValue,
    selfHostedMonthlyUSD,
    apiResults, cloudResults,
    monthlyInputTokens, monthlyOutputTokens,
  }
}
