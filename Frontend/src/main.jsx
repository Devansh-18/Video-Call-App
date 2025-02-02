import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {BrowserRouter} from 'react-router-dom'
import {Toaster} from 'react-hot-toast'
import App from './App.jsx'
import RTCProvider from './context/RTCContext.jsx'
import SocketContextProvider from './context/SocketContext.jsx'
import AppContextProvider from './context/AppContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SocketContextProvider>
        <AppContextProvider>
          <RTCProvider>
              <App />
              <Toaster/>
          </RTCProvider>
        </AppContextProvider>
      </SocketContextProvider>
    </BrowserRouter>
  </StrictMode>,
)
