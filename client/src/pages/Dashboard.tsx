import CortexDashboardLayout from "@/components/CortexDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Brain,
  Zap,
  GitBranch,
  Plug,
  Settings,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";

/**
 * CORTEX Dashboard Home Page
 * 
 * Displays an overview of the system with quick-access cards for each major feature.
 * Provides a refined, elegant introduction to the CORTEX workbench.
 */
export default function Dashboard() {
  const features = [
    {
      title: "Chat",
      description: "Conversational AI interface with streaming responses and context transparency",
      icon: MessageCircle,
      href: "/chat",
      badge: "Ready",
    },
    {
      title: "Neural Brain Map",
      description: "Spatial node-based project organization with hierarchical and graph views",
      icon: Brain,
      href: "/brain-map",
      badge: "In Progress",
    },
    {
      title: "Model Hub",
      description: "Manage local Ollama/Llama.cpp models and multi-provider API connections",
      icon: Zap,
      href: "/model-hub",
      badge: "In Progress",
    },
    {
      title: "Project Pipelines",
      description: "Multi-step workflow orchestration with action hashing and loop detection",
      icon: GitBranch,
      href: "/pipelines",
      badge: "Planned",
    },
    {
      title: "Integrations",
      description: "Connect third-party apps and services via OAuth and API integrations",
      icon: Plug,
      href: "/integrations",
      badge: "Planned",
    },
    {
      title: "Settings",
      description: "Configuration, knowledge base management, and security settings",
      icon: Settings,
      href: "/settings",
      badge: "Planned",
    },
  ];

  return (
    <CortexDashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="border-b border-border bg-gradient-to-br from-card to-background">
          <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-accent">Welcome to CORTEX</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              The Ultimate All-in-One AI Workbench
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              A powerful, elegant, and polished local-first AI workstation designed for power users
              who demand both function and beauty. Seamlessly integrate local and API-based AI models,
              manage complex projects, and orchestrate multi-step workflows—all in one refined interface.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Core Features</h2>
            <p className="text-muted-foreground">
              Explore the powerful capabilities of CORTEX
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href} className="block">
                  <Card className="h-full hover:border-accent/50 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                          <Icon className="w-6 h-6 text-accent" />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {feature.badge}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 group/btn"
                      >
                        Explore
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="border-t border-border bg-card">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-bold mb-8">System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: "Local Models", value: "0", description: "Connected via Ollama" },
                { label: "API Providers", value: "0", description: "Configured integrations" },
                { label: "Active Projects", value: "0", description: "Neural networks" },
                { label: "Context Size", value: "0 KB", description: "Current memory usage" },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-lg bg-background border border-border">
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold mb-2">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CortexDashboardLayout>
  );
}
