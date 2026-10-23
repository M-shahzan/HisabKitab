import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
        <Store className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
        Page Not Found
      </h2>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        The requested screen could not be located. Return to New Order to continue billing.
      </p>
      <Link href="/" className="mt-6">
        <Button size="md" className="shadow-sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span>Go to New Order</span>
        </Button>
      </Link>
    </div>
  );
}
