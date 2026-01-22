import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShipWheel } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const managerLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const driverLoginSchema = z.object({
  temporaryUsername: z.string().min(1, "Temporary username is required"),
  temporaryPassword: z.string().min(1, "Temporary password is required"),
});

type ManagerLoginForm = z.infer<typeof managerLoginSchema>;
type DriverLoginForm = z.infer<typeof driverLoginSchema>;

export default function Login() {
  const [match, params] = useRoute("/login/:type");
  const type = params?.type === "driver" ? "driver" : "manager";
  const { loginManager, loginDriver, isManagerLoggingIn, isDriverLoggingIn } = useAuth();
  
  const managerForm = useForm<ManagerLoginForm>({
    resolver: zodResolver(managerLoginSchema),
  });

  const driverForm = useForm<DriverLoginForm>({
    resolver: zodResolver(driverLoginSchema),
  });

  const onSubmitManager = (data: ManagerLoginForm) => {
    loginManager(data);
  };

  const onSubmitDriver = (data: DriverLoginForm) => {
    loginDriver(data);
  };

  const isPending = type === "manager" ? isManagerLoggingIn : isDriverLoggingIn;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-slate-200 shadow-xl bg-white/80 backdrop-blur-sm z-10">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-6">
            <div className={`p-4 rounded-full ${type === 'manager' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
              {type === 'manager' ? <ShieldCheck className="w-10 h-10" /> : <ShipWheel className="w-10 h-10" />}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center font-display">
            {type === 'manager' ? 'Manager Portal' : 'Driver Access'}
          </CardTitle>
          <CardDescription className="text-center">
            {type === 'manager' ? 'Enter your credentials to access the dashboard' : 'Enter your temporary trip credentials'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6 bg-slate-100 p-1 rounded-lg">
             <Link href="/login/manager" className={`flex-1 py-2 text-center rounded-md text-sm font-medium transition-all ${type === 'manager' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
               Manager
             </Link>
             <Link href="/login/driver" className={`flex-1 py-2 text-center rounded-md text-sm font-medium transition-all ${type === 'driver' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
               Driver
             </Link>
          </div>

          {type === 'manager' ? (
            <form onSubmit={managerForm.handleSubmit(onSubmitManager)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  placeholder="Enter username" 
                  {...managerForm.register("username")} 
                  className="bg-white"
                />
                {managerForm.formState.errors.username && (
                  <p className="text-sm text-destructive">{managerForm.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  {...managerForm.register("password")} 
                  className="bg-white"
                />
                {managerForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{managerForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full text-lg h-12 mt-4 font-semibold shadow-lg shadow-primary/20" 
                disabled={isPending}
              >
                {isPending ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={driverForm.handleSubmit(onSubmitDriver)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="temporaryUsername">Temporary Username</Label>
                <Input 
                  id="temporaryUsername" 
                  placeholder="Enter temporary username" 
                  {...driverForm.register("temporaryUsername")} 
                  className="bg-white"
                />
                {driverForm.formState.errors.temporaryUsername && (
                  <p className="text-sm text-destructive">{driverForm.formState.errors.temporaryUsername.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="temporaryPassword">Temporary Password</Label>
                <Input 
                  id="temporaryPassword" 
                  type="password" 
                  placeholder="Enter temporary password" 
                  {...driverForm.register("temporaryPassword")} 
                  className="bg-white"
                />
                {driverForm.formState.errors.temporaryPassword && (
                  <p className="text-sm text-destructive">{driverForm.formState.errors.temporaryPassword.message}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full text-lg h-12 mt-4 font-semibold shadow-lg shadow-primary/20" 
                disabled={isPending}
              >
                {isPending ? "Authenticating..." : "Start Trip"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t border-slate-100 py-4">
          <p className="text-sm text-muted-foreground">
            Don't have an account? Contact admin.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
