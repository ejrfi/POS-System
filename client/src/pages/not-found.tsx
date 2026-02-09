import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md mx-4 shadow-xl text-center p-6">
        <CardContent className="pt-6">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center text-red-500">
              <AlertCircle className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">404 Page Not Found</h1>
          <p className="text-gray-600 mb-6">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <Link href="/pos">
            <Button className="w-full">Return to POS</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
