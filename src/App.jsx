import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from './store/ConfigContext'
import LandingScreen from './screens/LandingScreen'
import ConfigureScreen from './screens/ConfigureScreen'
import ModelScreen from './screens/ModelScreen'
import ScaleScreen from './screens/ScaleScreen'
import DeploymentScreen from './screens/DeploymentScreen'
import ResultsScreen from './screens/ResultsScreen'

function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/configure" element={<ConfigureScreen />} />
          <Route path="/model" element={<ModelScreen />} />
          <Route path="/scale" element={<ScaleScreen />} />
          <Route path="/deployment" element={<DeploymentScreen />} />
          <Route path="/results" element={<ResultsScreen />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
