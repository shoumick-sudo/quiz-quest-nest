import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { validateAdmin } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin = ({ onLogin }: AdminLoginProps) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAdmin(id, password)) {
      toast({
        title: "Login successful",
        description: "Welcome back, admin!",
      });
      onLogin();
    } else {
      toast({
        title: "Login failed",
        description: "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Admin Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Admin ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminLogin;