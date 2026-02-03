'use client'

import { useState } from 'react'
import {
  Check,
  Zap,
  Crown,
  Building,
  CreditCard,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react'

interface Plan {
  id: string
  name: string
  price: number
  interval: 'monthly' | 'yearly'
  characters: number
  features: string[]
  popular?: boolean
  icon: React.ElementType
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'monthly',
    characters: 10000,
    icon: Zap,
    features: [
      '10,000 characters/month',
      '3 custom voice clones',
      'Standard voice quality',
      'API access',
      'Community support'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 5,
    interval: 'monthly',
    characters: 30000,
    icon: Sparkles,
    features: [
      '30,000 characters/month',
      '10 custom voice clones',
      'High quality voices',
      'Priority API access',
      'Email support'
    ]
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 22,
    interval: 'monthly',
    characters: 100000,
    icon: Crown,
    popular: true,
    features: [
      '100,000 characters/month',
      '30 custom voice clones',
      'Ultra-high quality voices',
      'Professional voice cloning',
      'Projects & long-form audio',
      'Priority support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    interval: 'monthly',
    characters: 500000,
    icon: Building,
    features: [
      '500,000 characters/month',
      'Unlimited voice clones',
      'All voice quality options',
      'Professional voice cloning',
      '44.1 kHz audio output',
      'Usage analytics',
      'Dedicated support'
    ]
  }
]

interface Invoice {
  id: string
  date: Date
  amount: number
  status: 'paid' | 'pending' | 'failed'
}

const sampleInvoices: Invoice[] = [
  { id: 'INV-001', date: new Date('2024-01-01'), amount: 22, status: 'paid' },
  { id: 'INV-002', date: new Date('2023-12-01'), amount: 22, status: 'paid' },
  { id: 'INV-003', date: new Date('2023-11-01'), amount: 22, status: 'paid' }
]

export default function SubscriptionPage() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [currentPlan] = useState('creator')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  const getPrice = (plan: Plan) => {
    if (billingInterval === 'yearly') {
      return Math.floor(plan.price * 0.8) // 20% discount for yearly
    }
    return plan.price
  }

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan)
    setShowPaymentModal(true)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Subscription</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">
            Manage your subscription and billing
          </p>
        </div>

        {/* Current Plan Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-[#7c3aed] to-[#db2777] rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-1">Current Plan</p>
              <h2 className="text-2xl font-bold text-white">Creator</h2>
              <p className="text-white/80 text-sm mt-1">
                100,000 characters/month • Renews Jan 1, 2025
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">$22</p>
              <p className="text-white/80 text-sm">/month</p>
            </div>
          </div>
        </div>

        {/* Billing Interval Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#1f1f1f] p-1 rounded-xl inline-flex">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                billingInterval === 'monthly'
                  ? 'bg-[#7c3aed] text-white'
                  : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                billingInterval === 'yearly'
                  ? 'bg-[#7c3aed] text-white'
                  : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {plans.map((plan) => {
            const price = getPrice(plan)
            const isCurrentPlan = plan.id === currentPlan

            return (
              <div
                key={plan.id}
                className={`relative bg-[#1f1f1f] rounded-2xl border transition ${
                  plan.popular
                    ? 'border-[#7c3aed]'
                    : isCurrentPlan
                    ? 'border-green-500'
                    : 'border-[#2f2f2f]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-[#7c3aed] text-white text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.popular ? 'bg-[#7c3aed]/20' : 'bg-[#2f2f2f]'
                    }`}>
                      <plan.icon className={`w-5 h-5 ${plan.popular ? 'text-[#7c3aed]' : 'text-[#a1a1a1]'}`} />
                    </div>
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold">${price}</span>
                    <span className="text-[#666]">/{billingInterval === 'yearly' ? 'mo' : 'month'}</span>
                    {billingInterval === 'yearly' && plan.price > 0 && (
                      <p className="text-xs text-green-400 mt-1">
                        Billed ${price * 12}/year
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-[#a1a1a1] mb-4">
                    {plan.characters.toLocaleString()} characters/month
                  </p>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-[#a1a1a1]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={isCurrentPlan}
                    className={`w-full py-3 rounded-xl font-medium transition ${
                      isCurrentPlan
                        ? 'bg-[#2f2f2f] text-[#666] cursor-not-allowed'
                        : plan.popular
                        ? 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white'
                        : 'bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Payment Method & Invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method */}
          <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
            <h3 className="font-semibold text-lg mb-4">Payment Method</h3>

            <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] rounded-xl mb-4">
              <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-[#666]">Expires 12/25</p>
              </div>
              <button className="text-sm text-[#7c3aed] hover:underline">
                Update
              </button>
            </div>

            <button className="text-sm text-[#a1a1a1] hover:text-white flex items-center gap-1">
              <CreditCard className="w-4 h-4" />
              Add payment method
            </button>
          </div>

          {/* Billing History */}
          <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Billing History</h3>
              <button className="text-sm text-[#7c3aed] hover:underline flex items-center gap-1">
                View all
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {sampleInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2f2f2f] rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-[#a1a1a1]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{invoice.id}</p>
                      <p className="text-xs text-[#666]">{formatDate(invoice.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      invoice.status === 'paid'
                        ? 'bg-green-500/20 text-green-400'
                        : invoice.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {invoice.status}
                    </span>
                    <span className="font-medium">${invoice.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cancel Subscription */}
        <div className="mt-8 p-6 bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Cancel Subscription</h3>
              <p className="text-sm text-[#a1a1a1] mt-1">
                Your plan will remain active until the end of the billing period
              </p>
            </div>
            <button className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition">
              Cancel Plan
            </button>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowPaymentModal(false)} />
            <div className="relative bg-[#1a1a1a] border border-[#2f2f2f] rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Upgrade to {selectedPlan.name}</h2>

              <div className="p-4 bg-[#0a0a0a] rounded-xl mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span>{selectedPlan.name} Plan</span>
                  <span className="font-bold">${getPrice(selectedPlan)}/mo</span>
                </div>
                <p className="text-sm text-[#666]">
                  {selectedPlan.characters.toLocaleString()} characters/month
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Card Number</label>
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Expiry</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">CVC</label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button className="flex-1 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-medium transition">
                  Subscribe
                </button>
              </div>

              <p className="text-xs text-[#666] text-center mt-4">
                Powered by Stripe. Your payment info is secure.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
