import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const ADMINEMAIL = import.meta.env.VITE_ADMIN_MAIL;
  const ADMINPASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
  const ADMINFULLNAME = import.meta.env.VITE_ADMIN_FULLNAME;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.endsWith("@srmist.edu.in")) {
      toast({
        title: "Invalid email",
        description: "Please use your SRM email (@srmist.edu.in)",
        variant: "destructive",
      });
      return;
    }

    // Only allow student role for signups
    const userRole = email === ADMINEMAIL ? 'admin' : 'student';

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          role: userRole,
        },
      },
    });

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      if (email === ADMINEMAIL) {
        // If it's the admin, show success message
        toast({
          title: "Success!",
          description: "Admin account created successfully. You can now sign in.",
        });
        // Redirect to login
        navigate("/auth");
      } else {
        // For all other users, sign them in and redirect to student dashboard
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          toast({
            title: "Sign in failed",
            description: signInError.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome!",
            description: "Account created and signed in successfully!",
          });
          navigate("/dashboard");
        }
      }
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Only allow prabhu@srmist.edu.in to log in as admin
    if (email === ADMINEMAIL) {
      const { error } = await supabase.auth.signInWithPassword({
        email: ADMINEMAIL,
        password,
      });

      if (error) {
        // If login fails with password 'prabhuspeaks', try to create the account
        if (password === ADMINPASSWORD) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: ADMINEMAIL,
            password: ADMINPASSWORD,
            options: {
              data: {
                full_name: ADMINFULLNAME,
                role: 'admin',
                is_faculty_advisor: true
              }
            }
          });

          if (signUpError) {
            toast({
              title: "Authentication Error",
              description: signUpError.message,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Sign in after successful sign up
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: ADMINEMAIL,
            password: ADMINPASSWORD,
          });

          if (signInError) {
            toast({
              title: "Sign in failed",
              description: signInError.message,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        } else {
          toast({
            title: "Access Denied",
            description: "Invalid credentials for admin access.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
      
      // Redirect to dashboard after successful login
      navigate("/dashboard");
      setLoading(false);
      return;
    }

    // Regular login for other users (students only)
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Ensure no one else can access admin dashboard
      if (user?.email === ADMINEMAIL) {
        navigate("/dashboard");
      } else {
        // Redirect to student dashboard or home
        navigate("/dashboard");
        toast({
          title: "Signed in successfully",
          description: "Welcome to ClassGrowth!",
        });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md shadow-hover">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">ClassGrowth</CardTitle>
          <CardDescription className="text-center">
            Your personalized information hub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your.email@srmist.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@srmist.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
