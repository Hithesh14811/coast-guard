import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Anchor, Ship, Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

const fishermanProfileSchema = z.object({
  fishermanName: z.string().min(1, "Name is required"),
  boatName: z.string().min(1, "Boat name is required"),
});

type FishermanProfileFormData = z.infer<typeof fishermanProfileSchema>;

export default function FishermanSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const form = useForm<FishermanProfileFormData>({
    resolver: zodResolver(fishermanProfileSchema),
    defaultValues: {
      fishermanName: user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.firstName || "",
      boatName: "",
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: FishermanProfileFormData) => {
      return apiRequest("POST", "/api/fisherman/profile", data);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile created",
        description: "Your fisherman profile has been set up successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create profile",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const onSubmit = (data: FishermanProfileFormData) => {
    createProfileMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ocean rounded-lg">
              <Anchor className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">CoastGuard Lite</h1>
              <p className="text-xs text-muted-foreground">Fisherman Setup</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button 
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              {logoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sign Out"
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-ocean/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Ship className="h-8 w-8 text-ocean" />
            </div>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Set up your fisherman profile to start sharing your location with the Coast Guard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fishermanName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your name"
                          data-testid="input-fisherman-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="boatName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Boat Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your boat name"
                          data-testid="input-boat-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-ocean hover:bg-ocean/90"
                  disabled={createProfileMutation.isPending}
                  data-testid="button-create-profile"
                >
                  {createProfileMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating profile...
                    </>
                  ) : (
                    <>
                      <Ship className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
