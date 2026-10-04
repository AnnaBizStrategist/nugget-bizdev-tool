import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ProfileStep from './onboarding/ProfileStep.jsx'

// Hidden test door: getnugget.ca/?start=1 shows the new onboarding screens.
// Everyone else still sees the normal site.
const showNewOnboarding = new URLSearchParams(window.location.search).get('start') === '1'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {showNewOnboarding ? (
      <ProfileStep onDone={(result) => console.log('Profile step done:', result.name, result.isNew)} />
    ) : (
      <App />
    )}
  </React.StrictMode>
)
