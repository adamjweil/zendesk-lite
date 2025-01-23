import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getIntegrations, createIntegration, updateIntegration, deleteIntegration } from '../lib/integrations'
import { PlusCircle, Trash2, Settings } from 'lucide-react'

const INTEGRATION_PROVIDERS = [
  {
    id: 'jira',
    name: 'Jira',
    description: 'Sync tickets with Jira issues',
    icon: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#0052CC"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.001-1.005zM23.019 0H11.461a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.019 12.49V1.005A1.005 1.005 0 0 0 23.019 0z"/></svg>
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Connect customer data',
    icon: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#00A1E0"><path d="M15.901 12.195a2.697 2.697 0 0 0-1.725.626c-.415-.48-1.038-.781-1.726-.781-.4 0-.781.107-1.108.297-.383-.67-1.101-1.12-1.923-1.12-.666 0-1.266.294-1.674.759a2.711 2.711 0 0 0-1.894-.768c-1.395 0-2.535 1.056-2.676 2.411a2.72 2.72 0 0 0-1.43 2.383c0 1.506 1.223 2.729 2.728 2.729.193 0 .382-.02.563-.059.35.948 1.251 1.624 2.307 1.624.78 0 1.476-.363 1.93-.929.454.566 1.15.929 1.93.929.857 0 1.614-.435 2.06-1.096.327.125.68.194 1.047.194 1.097 0 2.058-.598 2.566-1.486.198.063.408.096.624.096 1.164 0 2.107-.943 2.107-2.107 0-1.135-.897-2.063-2.02-2.114a2.724 2.724 0 0 0-2.686-2.358"/></svg>
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Real-time notifications and updates',
    icon: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#4A154B"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS and voice communication',
    icon: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#F22F46"><path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm0 4.92a2.04 2.04 0 110 4.08 2.04 2.04 0 010-4.08zm5.04 2.04a2.04 2.04 0 110 4.08 2.04 2.04 0 010-4.08zm-10.08 0a2.04 2.04 0 110 4.08 2.04 2.04 0 010-4.08zm5.04 5.04a2.04 2.04 0 110 4.08 2.04 2.04 0 010-4.08zm5.04 2.04a2.04 2.04 0 110 4.08 2.04 2.04 0 010-4.08zm-10.08 0a2.04 2.04 0 110 4.08 2.04 2.04 0 010-4.08z"/></svg>
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'CRM and marketing automation',
    icon: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#FF7A59"><path d="M22.447 9.588h-.565c-.452 0-.818-.367-.818V6.235a.818.818 0 0 1 .818-.818h.565a.818.818 0 0 1 .818.818V8.77a.818.818 0 0 1-.818.818zm-3.953 0h-.565a.818.818 0 0 1-.818-.818V6.235c0-.452.367-.818.818-.818h.565c.452 0 .818.367.818.818V8.77a.818.818 0 0 1-.818.818zm-3.953 0h-.565a.818.818 0 0 1-.818-.818V6.235c0-.452.367-.818.818-.818h.565c.452 0 .818.367.818.818V8.77a.818.818 0 0 1-.818.818zm-3.953 0h-.565a.818.818 0 0 1-.818-.818V6.235c0-.452.367-.818.818-.818h.565c.452 0 .818.367.818.818V8.77a.818.818 0 0 1-.818.818zm-3.953 0h-.565a.818.818 0 0 1-.818-.818V6.235c0-.452.367-.818.818-.818h.565c.452 0 .818.367.818.818V8.77a.818.818 0 0 1-.818.818zm19.765 3.953h-.565a.818.818 0 0 1-.818-.818v-2.535c0-.452.367-.818.818-.818h.565c.452 0 .818.367.818.818v2.535a.818.818 0 0 1-.818.818zm-3.953 0h-.565a.818.818 0 0 1-.818-.818v-2.535c0-.452.367-.818.818-.818h.565c.452 0 .818.367.818.818v2.535a.818.818 0 0 1-.818.818zm-3.953 0h-.565a.818.818 0 0 1-.818-.818v-2.535c0-.452.367-.818.818-.818h.565c.452 0 .818.367.818.818v2.535a.818.818 0 0 1-.818.818zm-3.953 0h-.565a.818.818 0 0 1-.818-.818v-2.535c0-.452.367-.818.818-.818h.565c.452 0 .818.367.818.818v2.535a.818.818 0 0 1-.818.818zm-3.953 0h-.565a.818.818 0 0 1-.818-.818v-2.535c0-.452.367-.818.818-.818h.565c.452 0 .818.367.818.818v2.535a.818.818 0 0 1-.818.818z"/></svg>
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Track user behavior and metrics',
    icon: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#E37400"><path d="M22.84 2.998C21.727 1.038 19.528 0 17.396 0c-2.883 0-5.367 1.886-6.272 4.523C10.096 1.886 7.612 0 4.728 0 2.596 0 .397 1.038-.716 2.998-2.285 5.765-.658 9.262 1.86 11.279c3.006 2.41 6.667 3.663 10.264 3.663 3.597 0 7.258-1.253 10.264-3.663 2.518-2.017 4.145-5.514 2.576-8.281z"/></svg>
  },
  {
    id: 'tableau',
    name: 'Tableau',
    description: 'Advanced data visualization',
    icon: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#E97627"><path d="M11.654 5.327H9.922V3.594h1.732v1.733zm0 3.462H9.922V7.056h1.732v1.733zm3.462 0h-1.731V7.056h1.731v1.733zm-3.462 3.461H9.922v-1.732h1.732v1.732zm3.462 0h-1.731v-1.732h1.731v1.732zM8.192 8.789H6.461V7.056h1.731v1.733zm0 3.461H6.461v-1.732h1.731v1.732zm3.462 3.462H9.922v-1.732h1.732v1.732zm3.462 0h-1.731v-1.732h1.731v1.732zM8.192 15.712H6.461V13.98h1.731v1.732zm7.615-10.385h-1.731V3.594h1.731v1.733zM19.27 8.789h-1.732V7.056h1.732v1.733zm-3.463 0h-1.731V7.056h1.731v1.733zm3.463 3.461h-1.732v-1.732h1.732v1.732zm-3.463 0h-1.731v-1.732h1.731v1.732zm-10.385 0H3.69v-1.732h1.732v1.732zm0 3.462H3.69V13.98h1.732v1.732zm13.848 0h-1.732V13.98h1.732v1.732zm-3.463 0h-1.731V13.98h1.731v1.732z"/></svg>
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'E-commerce integration',
    icon: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#7AB55C"><path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.186-.198-.194-.084-.009-1.256-.09-1.256-.09s-.847-.872-1.042-1.08c-.411-.422-.48-.494-.538-.523-.41-.244-1.046-.169-1.456-.134-.388.033-1.627.501-1.627.501s-.996.313-1.537.313c-.54 0-1.076-.195-1.614-.195-.538 0-.921.134-.921.134s-.825.233-1.233.757c-.409.523-.286 1.076-.13 1.344.155.27.409.486.409.486s-.314 2.287-.374 2.71c-.059.424-1.256 9.563-1.256 9.563L15.337 24v-.021zm4.967-19.185c-.037.033-.825.252-.825.252s-.796.243-1.189.364c-.393.121-1.189.374-1.189.374s-1.003-1.919-1.099-2.099c.049.116.06.26.021.399-.059.195-.173.364-.323.498-.151.134-.34.233-.544.288-.204.056-.419.069-.632.039-.213-.03-.411-.104-.578-.216-.167-.112-.294-.258-.374-.422-.081-.165-.111-.345-.09-.523.02-.177.091-.345.198-.486.107-.142.253-.255.419-.332.167-.077.351-.116.54-.116.188 0 .37.039.533.116.163.078.301.191.4.332.011-.004.099-.039.099-.039s.883-.273 1.33-.409c.447-.134 1.344-.41 1.344-.41s.139-.042.208-.062c-.595-1.076-1.329-2.099-2.406-2.099 0 0-1.666-.116-2.496.523-.831.637-1.537 1.597-1.537 1.597s-1.329.409-2.034.637c-.705.226-2.118.663-2.118.663S6.807 3.582 6.653 3.582c-.151 0-.363.116-.417.116-.053 0-.151.039-.182.039-.03 0-.083.042-.099.116-.017.075-.017.116-.053.157-.037.039-.28.09-.28.09S.047 5.387.001 5.485c-.046.1.069.157.099.195.03.039 5.475 1.172 5.475 1.172s.087 2.603.159 3.997l8.894 1.721 5.676-1.172s.151-5.594.159-5.789c.008-.194.008-.333-.159-.815"/></svg>
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Project management integration',
    icon: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#0079BF"><path d="M21 3H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7.5 17.5c0 .28-.22.5-.5.5H4c-.28 0-.5-.22-.5-.5v-11c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5v11zm9-4c0 .28-.22.5-.5.5h-3c-.28 0-.5-.22-.5-.5v-7c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5v7z"/></svg>
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Code and issue tracking',
    icon: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#181717"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
  }
]

function IntegrationIcon({ src, name }) {
  const [error, setError] = useState(false)

  if (error) {
    // Fallback icon when image fails to load
    return (
      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
        <span className="text-lg font-medium text-gray-600">
          {name.charAt(0)}
        </span>
      </div>
    )
  }

  return (
    <img
      className="h-10 w-10"
      src={src}
      alt={name}
      onError={() => setError(true)}
    />
  )
}

export default function Integrations() {
  const { profile } = useAuth()
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [configuring, setConfiguring] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      const { data, error } = await getIntegrations()
      if (error) throw error
      setIntegrations(data || [])
    } catch (error) {
      console.error('Error loading integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddIntegration = async (provider) => {
    setSelectedProvider(provider)
    setFormData({})
    setConfiguring(true)
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSaveIntegration = async () => {
    try {
      const config = {}
      const credentials = {}
      
      // Split form data into config and credentials
      Object.entries(formData).forEach(([key, value]) => {
        if (key.startsWith('credential_')) {
          credentials[key.replace('credential_', '')] = value
        } else {
          config[key] = value
        }
      })

      const { error } = await createIntegration(selectedProvider, config, credentials)
      if (error) throw error
      loadIntegrations()
      setConfiguring(false)
      setSelectedProvider('')
      setFormData({})
    } catch (error) {
      console.error('Error saving integration:', error)
    }
  }

  const handleDeleteIntegration = async (id) => {
    try {
      const { error } = await deleteIntegration(id)
      if (error) throw error
      loadIntegrations()
    } catch (error) {
      console.error('Error deleting integration:', error)
    }
  }

  const renderConfigurationForm = () => {
    const renderField = (label, name, type = 'text', placeholder = '') => (
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {label}
          <input
            type={type}
            name={name}
            value={formData[name] || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder={placeholder}
          />
        </label>
      </div>
    )

    switch (selectedProvider) {
      case 'jira':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configure Jira Integration</h3>
            {renderField('Jira Domain', 'domain', 'text', 'https://your-domain.atlassian.net')}
            {renderField('API Token', 'credential_api_token', 'password')}
            {renderField('Project Key', 'project_key')}
            {renderField('Username', 'credential_username')}
          </div>
        )
      
      case 'salesforce':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configure Salesforce Integration</h3>
            {renderField('Instance URL', 'instance_url', 'text', 'https://your-instance.salesforce.com')}
            {renderField('Client ID', 'credential_client_id')}
            {renderField('Client Secret', 'credential_client_secret', 'password')}
            {renderField('Username', 'credential_username')}
            {renderField('Password', 'credential_password', 'password')}
          </div>
        )

      case 'slack':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configure Slack Integration</h3>
            {renderField('Workspace Name', 'workspace_name')}
            {renderField('Bot Token', 'credential_bot_token', 'password')}
            {renderField('Signing Secret', 'credential_signing_secret', 'password')}
            {renderField('Default Channel', 'default_channel', 'text', '#support')}
          </div>
        )

      case 'twilio':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configure Twilio Integration</h3>
            {renderField('Account SID', 'credential_account_sid')}
            {renderField('Auth Token', 'credential_auth_token', 'password')}
            {renderField('Phone Number', 'phone_number', 'tel')}
            {renderField('Message Template', 'message_template', 'textarea')}
          </div>
        )

      case 'hubspot':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configure HubSpot Integration</h3>
            {renderField('API Key', 'credential_api_key', 'password')}
            {renderField('Portal ID', 'portal_id')}
            {renderField('Pipeline Name', 'pipeline_name')}
          </div>
        )

      case 'google-analytics':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configure Google Analytics Integration</h3>
            {renderField('Tracking ID', 'tracking_id')}
            {renderField('View ID', 'view_id')}
            {renderField('Client Email', 'credential_client_email')}
            {renderField('Private Key', 'credential_private_key', 'password')}
          </div>
        )

      case 'tableau':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configure Tableau Integration</h3>
            {renderField('Site URL', 'site_url')}
            {renderField('Token Name', 'credential_token_name')}
            {renderField('Token Value', 'credential_token_value', 'password')}
            {renderField('Site ID', 'site_id')}
          </div>
        )

      case 'shopify':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configure Shopify Integration</h3>
            {renderField('Shop Domain', 'shop_domain', 'text', 'your-store.myshopify.com')}
            {renderField('Access Token', 'credential_access_token', 'password')}
            {renderField('API Version', 'api_version', 'text', '2024-01')}
          </div>
        )

      case 'trello':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configure Trello Integration</h3>
            {renderField('API Key', 'credential_api_key', 'password')}
            {renderField('Token', 'credential_token', 'password')}
            {renderField('Board ID', 'board_id')}
            {renderField('List Name', 'list_name')}
          </div>
        )

      case 'github':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configure GitHub Integration</h3>
            {renderField('Repository Owner', 'repo_owner')}
            {renderField('Repository Name', 'repo_name')}
            {renderField('Access Token', 'credential_access_token', 'password')}
            {renderField('Labels', 'labels', 'text', 'bug,feature,support')}
          </div>
        )
      
      default:
        return null
    }
  }

  if (!profile?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <div className="max-w-md mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <p>You need admin privileges to access this page.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Integrations</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your organization's integrations with external services.
          </p>
        </div>
      </div>

      {/* Available Integrations */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATION_PROVIDERS.map((provider) => (
          <div
            key={provider.id}
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
          >
            <div className="flex-shrink-0">
              {provider.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="focus:outline-none">
                <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                <p className="text-sm text-gray-500 truncate">
                  {provider.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleAddIntegration(provider.id)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add
            </button>
          </div>
        ))}
      </div>

      {/* Active Integrations */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Active Integrations</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const provider = INTEGRATION_PROVIDERS.find(p => p.id === integration.provider)
            return (
              <div
                key={integration.id}
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3"
              >
                <div className="flex-shrink-0">
                  <IntegrationIcon
                    src={provider?.icon}
                    name={provider?.name || integration.provider}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {provider?.name || integration.provider}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {integration.enabled ? 'Active' : 'Disabled'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDeleteIntegration(integration.id)}
                    className="inline-flex items-center text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <button className="inline-flex items-center text-gray-600 hover:text-gray-900">
                    <Settings className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Configuration Modal */}
      {configuring && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  onClick={() => {
                    setConfiguring(false);
                    setSelectedProvider('');
                    setFormData({});
                  }}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-3 text-center sm:mt-0 sm:text-left">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0">
                    {INTEGRATION_PROVIDERS.find(p => p.id === selectedProvider)?.icon}
                  </div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Configure {INTEGRATION_PROVIDERS.find(p => p.id === selectedProvider)?.name}
                  </h3>
                </div>
                <div className="mt-2">
                  {renderConfigurationForm()}
                </div>
              </div>

              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSaveIntegration}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfiguring(false);
                    setSelectedProvider('');
                    setFormData({});
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 