import Link from "next/link";
import { Check, Sparkles, Zap, Crown, Building } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    description: "Get started with AI creation",
    price: "$0",
    period: "forever",
    icon: Sparkles,
    features: [
      "50 image generations/day",
      "10 video generations/day",
      "Basic AI models",
      "Standard queue",
      "Watermark on outputs",
      "512x512 max resolution",
      "Community support",
    ],
    limitations: [
      "No real-time canvas",
      "No custom training",
      "No API access",
    ],
    cta: "Get Started",
    ctaVariant: "outline" as const,
    popular: false,
  },
  {
    name: "Basic",
    description: "For hobbyists and creators",
    price: "$8",
    period: "per month",
    icon: Zap,
    features: [
      "200 image generations/day",
      "30 video generations/day",
      "All basic models",
      "Priority queue",
      "No watermark",
      "1024x1024 max resolution",
      "Email support",
      "Basic real-time canvas",
    ],
    limitations: [
      "Limited model training",
    ],
    cta: "Start Free Trial",
    ctaVariant: "outline" as const,
    popular: false,
  },
  {
    name: "Pro",
    description: "For professionals and teams",
    price: "$28",
    period: "per month",
    icon: Crown,
    features: [
      "Unlimited generations",
      "All AI models including premium",
      "Full real-time canvas access",
      "5 custom model trainings/mo",
      "Commercial license",
      "4K resolution support",
      "Priority support",
      "API access (10K calls/mo)",
      "Private generations",
      "8 parallel generations",
    ],
    limitations: [],
    cta: "Start Free Trial",
    ctaVariant: "gradient" as const,
    popular: true,
  },
  {
    name: "Max",
    description: "For power users",
    price: "$48",
    period: "per month",
    icon: Crown,
    features: [
      "Everything in Pro",
      "Highest priority queue",
      "10 custom model trainings/mo",
      "8K resolution support",
      "API access (50K calls/mo)",
      "16 parallel generations",
      "Dedicated support",
      "Early access to features",
    ],
    limitations: [],
    cta: "Start Free Trial",
    ctaVariant: "outline" as const,
    popular: false,
  },
];

const enterprisePlan = {
  name: "Enterprise",
  description: "For organizations with custom needs",
  icon: Building,
  features: [
    "Unlimited everything",
    "Custom model training",
    "SSO integration",
    "Dedicated infrastructure",
    "SLA guarantees",
    "Custom integrations",
    "Dedicated account manager",
    "On-premise deployment option",
  ],
};

const faqs = [
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and wire transfers for enterprise customers.",
  },
  {
    question: "Do unused credits roll over?",
    answer: "On Basic and Pro plans, unused daily credits don't roll over. Enterprise plans include rollover credits.",
  },
  {
    question: "What's included in commercial license?",
    answer: "Pro and higher plans include full commercial rights to use generated content for any purpose including commercial projects.",
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer: "Yes, you can change your plan at any time. Changes take effect at the start of your next billing cycle.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-gradient-to-b from-purple-900/20 to-background">
          <div className="container mx-auto px-4 text-center">
            <Badge className="mb-4">Pricing</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start for free, upgrade when you need more. All plans include access to our core features.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "relative rounded-2xl border bg-card p-6",
                    plan.popular ? "border-primary shadow-lg shadow-primary/20" : "border-border"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="default">Most Popular</Badge>
                    </div>
                  )}

                  <div className="mb-6">
                    <plan.icon className={cn(
                      "h-10 w-10 mb-3",
                      plan.popular ? "text-primary" : "text-muted-foreground"
                    )} />
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {plan.limitations.map((limitation) => (
                      <li key={limitation} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="h-4 w-4 mt-0.5 shrink-0 text-center">-</span>
                        {limitation}
                      </li>
                    ))}
                  </ul>

                  <Link href="/login">
                    <Button variant={plan.ctaVariant} className="w-full">
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            {/* Enterprise */}
            <div className="mt-12 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-border bg-card p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <enterprisePlan.icon className="h-8 w-8 text-primary" />
                      <h3 className="text-2xl font-bold">{enterprisePlan.name}</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">{enterprisePlan.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {enterprisePlan.features.slice(0, 4).map((feature) => (
                        <Badge key={feature} variant="secondary">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Link href="/contact">
                      <Button variant="outline" size="lg">
                        Contact Sales
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 bg-card/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to start creating?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of creators using Krya. Start for free, no credit card required.
            </p>
            <Link href="/login">
              <Button variant="gradient" size="lg">
                Get Started Free
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
