import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Anchor, 
  Navigation, 
  Radar, 
  MapPin, 
  Waves, 
  Shield, 
  ArrowRight,
  Ship,
  Radio
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ocean rounded-lg">
              <Anchor className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl">CoastGuard Lite</h1>
              <p className="text-xs text-muted-foreground">GPS Tracking & Drift Prediction</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main>
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-ocean/10 via-background to-ocean-dark/5" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ocean/10 text-ocean-dark dark:text-ocean text-sm font-medium">
                <Radio className="h-4 w-4" />
                <span>Real-time GPS Tracking System</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Protecting Fishermen at Sea with{" "}
                <span className="text-ocean">Smart Tracking</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Track fishermen in real-time using GPS, detect signal loss automatically, 
                and predict drift locations using advanced ocean current and wind data analysis.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/fisherman">
                  <Button size="lg" className="h-12 px-8 bg-live hover:bg-live/90" data-testid="link-fisherman-app">
                    <Navigation className="h-5 w-5 mr-2" />
                    Fisherman App
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="lg" variant="outline" className="h-12 px-8" data-testid="link-dashboard">
                    <Radar className="h-5 w-5 mr-2" />
                    Coast Guard Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 border-t">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-2 mb-12">
              <h3 className="text-2xl font-bold">How It Works</h3>
              <p className="text-muted-foreground">
                A complete solution for maritime safety and search operations
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="hover-elevate">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-live/10 flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 text-live" />
                  </div>
                  <CardTitle className="text-lg">Live GPS Tracking</CardTitle>
                  <CardDescription>
                    Fishermen share their GPS coordinates in real-time every 10 seconds 
                    while connected to the network.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover-elevate">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-drift/10 flex items-center justify-center mb-4">
                    <Radar className="h-6 w-6 text-drift" />
                  </div>
                  <CardTitle className="text-lg">Signal Loss Detection</CardTitle>
                  <CardDescription>
                    Automatic detection when GPS signal is lost for more than 60 seconds, 
                    triggering drift prediction mode.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover-elevate">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-ocean/10 flex items-center justify-center mb-4">
                    <Waves className="h-6 w-6 text-ocean" />
                  </div>
                  <CardTitle className="text-lg">Drift Prediction</CardTitle>
                  <CardDescription>
                    Monte Carlo simulation using real marine weather data to predict 
                    probable drift locations and search areas.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 bg-card/50 border-t">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ocean/10 text-ocean-dark dark:text-ocean text-sm">
                  <Ship className="h-4 w-4" />
                  <span>For Fishermen</span>
                </div>
                <h3 className="text-3xl font-bold">Simple Mobile App</h3>
                <p className="text-muted-foreground">
                  A battery-efficient mobile web app that fishermen can use to share 
                  their location with the coast guard. Just tap one button to start 
                  or stop sharing your GPS coordinates.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-live/20 flex items-center justify-center">
                      <Navigation className="h-3 w-3 text-live" />
                    </div>
                    <span className="text-sm">One-tap location sharing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-live/20 flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-live" />
                    </div>
                    <span className="text-sm">Live map preview</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-live/20 flex items-center justify-center">
                      <Radio className="h-3 w-3 text-live" />
                    </div>
                    <span className="text-sm">Connection status indicator</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                  <Shield className="h-4 w-4" />
                  <span>For Coast Guard</span>
                </div>
                <h3 className="text-3xl font-bold">Powerful Dashboard</h3>
                <p className="text-muted-foreground">
                  A comprehensive dashboard with live tracking maps, drift prediction 
                  visualization, search area heatmaps, and real-time marine weather data 
                  integration.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Radar className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm">Monte Carlo drift simulation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Waves className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm">Real-time marine weather data</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm">Search area heatmap visualization</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 border-t">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h3 className="text-2xl font-bold">Ready to Get Started?</h3>
              <p className="text-muted-foreground">
                Choose your app based on your role. Fishermen should use the mobile app, 
                while coast guard personnel should access the dashboard.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/fisherman">
                  <Button size="lg" className="w-full sm:w-auto bg-live hover:bg-live/90" data-testid="link-fisherman-app-footer">
                    <Navigation className="h-5 w-5 mr-2" />
                    Open Fisherman App
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="link-dashboard-footer">
                    <Radar className="h-5 w-5 mr-2" />
                    Open Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>CoastGuard Lite - GPS Tracking & Drift Prediction System</p>
          <p className="mt-1">Powered by Open-Meteo Marine Weather API</p>
        </div>
      </footer>
    </div>
  );
}
