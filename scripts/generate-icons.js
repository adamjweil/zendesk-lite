import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as icons from 'simple-icons'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const iconConfigs = [
  { id: 'jira', name: 'Jira', color: '#0052CC' },
  { id: 'salesforce', name: 'Salesforce', color: '#00A1E0' },
  { id: 'slack', name: 'Slack', color: '#4A154B' },
  { id: 'twilio', name: 'Twilio', color: '#F22F46' },
  { id: 'hubspot', name: 'HubSpot', color: '#FF7A59' },
  { id: 'google-analytics', name: 'Google Analytics', color: '#E37400', iconName: 'googleanalytics' },
  { id: 'tableau', name: 'Tableau', color: '#E97627' },
  { id: 'shopify', name: 'Shopify', color: '#7AB55C' },
  { id: 'trello', name: 'Trello', color: '#0079BF' },
  { id: 'github', name: 'GitHub', color: '#181717' }
]

const iconDir = path.join(__dirname, '../public/integration-icons')

// Create directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true })
}

// Generate SVG files
iconConfigs.forEach((config) => {
  const iconName = config.iconName || config.id
  const iconKey = `si${iconName.charAt(0).toUpperCase()}${iconName.slice(1)}`
  const icon = icons[iconKey]
  
  if (!icon) {
    console.error(`Icon not found: ${iconName} (${iconKey})`)
    return
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${config.color}">
    ${icon.path}
  </svg>`
  
  fs.writeFileSync(
    path.join(iconDir, `${config.id}-icon.svg`),
    svg
  )
  
  console.log(`Generated ${config.id}-icon.svg`)
}) 