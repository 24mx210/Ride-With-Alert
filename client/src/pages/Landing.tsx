import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Truck, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-2">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-display">RideWithAlert</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login/driver">
              <Button variant="outline" className="font-semibold">Driver Login</Button>
            </Link>
            <Link href="/login/manager">
              <Button className="font-semibold shadow-lg shadow-primary/20">Manager Portal</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="relative overflow-hidden pt-16 pb-32 lg:pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 font-display">
              Safety on Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Mile</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Advanced vehicle monitoring and emergency response system. 
              Real-time tracking, instant alerts, and seamless communication for modern fleets.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login/driver">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-900/10">
                  I am a Driver
                </Button>
              </Link>
              <Link href="/login/manager">
                 <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2">
                  I am a Fleet Manager
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 pointer-events-none">
             <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
             <div className="absolute top-20 right-10 w-72 h-72 bg-accent rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
             <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                    <Truck className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Fleet Tracking</CardTitle>
                  <CardDescription>Real-time location updates for all registered vehicles.</CardDescription>
                </CardHeader>
                <CardContent>
                  Monitor your entire fleet on a live map with status indicators and route history.
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                   <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
                    <ShieldAlert className="w-6 h-6 text-destructive" />
                  </div>
                  <CardTitle>Emergency Response</CardTitle>
                  <CardDescription>Instant alerts with video and audio evidence.</CardDescription>
                </CardHeader>
                <CardContent>
                  One-tap SOS triggers immediate alarms on manager dashboard with live location data.
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                   <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>Driver Management</CardTitle>
                  <CardDescription>Easy vehicle assignment and driver profiles.</CardDescription>
                </CardHeader>
                <CardContent>
                  Manage driver credentials, assign vehicles, and track shift performance efficiently.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500">
          <p>© 2025 RideWithAlert System. Secure. Reliable. Fast.</p>
        </div>
      </footer>
    </div>
  );
}
