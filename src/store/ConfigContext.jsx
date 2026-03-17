import { createContext, useContext, useState } from 'react'

const ConfigContext = createContext()

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({
    useCase: null,
    precision: null,
    contextLength: null,
    mode: 'inference',
    model: null,
  })

  const update = (partial) => setConfig((prev) => ({ ...prev, ...partial }))

  return (
    <ConfigContext.Provider value={{ config, update }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  return useContext(ConfigContext)
}
