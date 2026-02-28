import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, Lock, User, ArrowRight, Zap, ShieldCheck, BarChart3, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const loginSchema = z.object({
  username: z.string().min(1, "Nama pengguna wajib diisi"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  async function onSubmit(data: z.infer<typeof loginSchema>) {
    setIsSubmitting(true);
    try {
      await login(data);
      setLocation("/pos");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Akses Ditolak",
        description: "Kredensial yang Anda masukkan tidak valid.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-slate-50 text-slate-900 relative overflow-hidden font-sans selection:bg-indigo-500/20">
      
      {/* LEFT COLUMN: Login Form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-16 relative bg-[#f8fafc] z-20">
        <div className="w-full max-w-md bg-white p-12 rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-slate-100 relative overflow-hidden transition-all duration-500 hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.12)]">
          
          <div className="space-y-8 relative z-10">
            <div className="text-center space-y-3">
              <div className="mb-6 mx-auto animate-in zoom-in duration-500">
                <img src="/logo-.svg" alt="Logo" className="h-20 w-auto mx-auto drop-shadow-lg" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Selamat Datang</h1>
              <p className="text-slate-500 font-medium">Masuk untuk mengelola sistem operasional.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-300" />
                          </div>
                          <Input 
                            className="pl-12 h-14 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 font-medium" 
                            placeholder="Username / ID Karyawan"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="flex justify-between items-center ml-1">
                        <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</FormLabel>
                        <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">Lupa password?</a>
                      </div>
                      <FormControl>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-300" />
                          </div>
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            className="pl-12 pr-12 h-14 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 font-medium" 
                            placeholder="Kata Sandi"
                            {...field} 
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-14 text-base font-bold tracking-wide rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20 hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all duration-300 group mt-4" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                      Memproses...
                    </>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Masuk Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          </div>
          
          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} G-Jarfy. <span className="text-emerald-600 font-semibold inline-flex items-center gap-1 ml-1"><ShieldCheck className="w-3 h-3" /> Secure</span>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Branding & Visuals */}
      <div className="hidden lg:flex flex-col items-center justify-center p-12 relative bg-gradient-to-br from-teal-400 to-cyan-300 overflow-hidden">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-white/20 rounded-full blur-[120px] animate-pulse" 
               style={{ transform: `translate(${mousePosition.x * -0.02}px, ${mousePosition.y * -0.02}px)` }} />
          <div className="absolute bottom-[-20%] left-[-20%] w-[60vw] h-[60vw] bg-teal-500/20 rounded-full blur-[120px]" 
               style={{ transform: `translate(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px)` }} />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.1] mix-blend-overlay" />
        </div>

        {/* Floating White Card */}
        <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl shadow-teal-900/10 p-12 text-center border border-white/50 animate-in zoom-in duration-700">
          
          <div className="mb-10 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-teal-100 rounded-full blur-3xl opacity-50 -z-10" />
             <img src="/logo-.svg" alt="Logo" className="h-48 w-auto mx-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 shadow-sm">
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest uppercase">Enterprise Ready</span>
            </div>
            
            <h2 className="text-4xl font-black tracking-tight leading-[1.1] text-slate-900">
              Transformasi Bisnis <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">
                Menjadi Lebih Cerdas
              </span>
            </h2>
            
            <p className="text-base text-slate-500 font-medium leading-relaxed px-4">
              Platform manajemen ritel all-in-one yang memberdayakan bisnis Anda dengan kecepatan, akurasi, dan wawasan mendalam.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100 mt-8">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-2xl font-black text-slate-900 mb-1">99.9%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uptime Server</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-2xl font-black text-slate-900 mb-1">24/7</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Support Aktif</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
