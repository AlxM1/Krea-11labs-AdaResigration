'use client'

import { useState } from 'react'
import {
  User,
  Mail,
  Lock,
  Bell,
  Shield,
  Trash2,
  Loader2,
  Camera,
  Check,
  AlertTriangle
} from 'lucide-react'

interface UserProfile {
  name: string
  email: string
  avatar?: string
  createdAt: Date
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date('2024-01-01')
  })

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    productNews: true,
    usageAlerts: true,
    weeklyDigest: false
  })

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    shareUsageData: true,
    allowPersonalization: true
  })

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ]

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
            <Check className="w-5 h-5 text-green-500" />
            <span className="text-green-400">Settings saved successfully</span>
          </div>
        )}

        <div className="flex gap-8">
          {/* Sidebar Tabs */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                    activeTab === tab.id
                      ? 'bg-[#7c3aed] text-white'
                      : 'text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f]'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
                  <h2 className="text-lg font-semibold mb-6">Profile Information</h2>

                  {/* Avatar */}
                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#db2777] flex items-center justify-center">
                        <span className="text-2xl font-bold">{profile.name.charAt(0)}</span>
                      </div>
                      <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-full flex items-center justify-center border-2 border-[#0a0a0a] transition">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <p className="font-medium">{profile.name}</p>
                      <p className="text-sm text-[#a1a1a1]">
                        Member since {profile.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                          className="w-full pl-12 pr-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                          className="w-full pl-12 pr-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                        />
                      </div>
                      <p className="text-xs text-[#666] mt-2">
                        Changing your email will require verification
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 rounded-xl font-medium transition"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
                  <h2 className="text-lg font-semibold mb-6">Change Password</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Current Password</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">New Password</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    className="mt-6 px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-medium transition"
                  >
                    Update Password
                  </button>
                </div>

                <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
                  <h2 className="text-lg font-semibold mb-4">Two-Factor Authentication</h2>
                  <p className="text-sm text-[#a1a1a1] mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <button className="px-4 py-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-xl text-sm transition">
                    Enable 2FA
                  </button>
                </div>

                <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-6">
                  <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
                  <p className="text-sm text-[#a1a1a1] mb-4">
                    Permanently delete your account and all associated data
                  </p>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
                <h2 className="text-lg font-semibold mb-6">Email Notifications</h2>

                <div className="space-y-4">
                  {[
                    { key: 'emailUpdates', label: 'Email Updates', desc: 'Receive important account updates' },
                    { key: 'productNews', label: 'Product News', desc: 'Learn about new features and improvements' },
                    { key: 'usageAlerts', label: 'Usage Alerts', desc: 'Get notified when approaching limits' },
                    { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of your weekly activity' }
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl cursor-pointer hover:bg-[#151515] transition"
                    >
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-[#666]">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) => setNotifications(n => ({ ...n, [item.key]: e.target.checked }))}
                        className="w-5 h-5 rounded border-[#2f2f2f] text-[#7c3aed] focus:ring-[#7c3aed]"
                      />
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleSave}
                  className="mt-6 px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-medium transition"
                >
                  Save Preferences
                </button>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
                  <h2 className="text-lg font-semibold mb-6">Privacy Settings</h2>

                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl cursor-pointer hover:bg-[#151515] transition">
                      <div>
                        <p className="font-medium">Share Usage Data</p>
                        <p className="text-sm text-[#666]">Help improve VoiceForge by sharing anonymous usage data</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.shareUsageData}
                        onChange={(e) => setPrivacy(p => ({ ...p, shareUsageData: e.target.checked }))}
                        className="w-5 h-5 rounded border-[#2f2f2f] text-[#7c3aed] focus:ring-[#7c3aed]"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl cursor-pointer hover:bg-[#151515] transition">
                      <div>
                        <p className="font-medium">Personalization</p>
                        <p className="text-sm text-[#666]">Allow personalized recommendations based on your usage</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.allowPersonalization}
                        onChange={(e) => setPrivacy(p => ({ ...p, allowPersonalization: e.target.checked }))}
                        className="w-5 h-5 rounded border-[#2f2f2f] text-[#7c3aed] focus:ring-[#7c3aed]"
                      />
                    </label>
                  </div>

                  <button
                    onClick={handleSave}
                    className="mt-6 px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-medium transition"
                  >
                    Save Preferences
                  </button>
                </div>

                <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
                  <h2 className="text-lg font-semibold mb-4">Data Export</h2>
                  <p className="text-sm text-[#a1a1a1] mb-4">
                    Download a copy of all your data including voice clones, generations, and settings
                  </p>
                  <button className="px-4 py-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-xl text-sm transition">
                    Request Data Export
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowDeleteModal(false)} />
            <div className="relative bg-[#1a1a1a] border border-[#2f2f2f] rounded-2xl p-6 w-full max-w-md">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-center mb-2">Delete Account</h2>
              <p className="text-[#a1a1a1] text-center mb-6">
                This action cannot be undone. All your data, voice clones, and generations will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-medium transition">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
