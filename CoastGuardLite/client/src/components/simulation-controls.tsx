import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, Loader2, Map, Route, AlertTriangle } from "lucide-react";

interface SimulationControlsProps {
  hours: number;
  onHoursChange: (hours: number) => void;
  showHeatmap: boolean;
  onShowHeatmapChange: (show: boolean) => void;
  showPaths: boolean;
  onShowPathsChange: (show: boolean) => void;
  onRunSimulation: () => void;
  isSimulating?: boolean;
  canSimulate?: boolean;
  isDriftMode?: boolean;
  className?: string;
}

export function SimulationControls({
  hours,
  onHoursChange,
  showHeatmap,
  onShowHeatmapChange,
  showPaths,
  onShowPathsChange,
  onRunSimulation,
  isSimulating = false,
  canSimulate = true,
  isDriftMode = false,
  className = "",
}: SimulationControlsProps) {
  const canRun = canSimulate && isDriftMode;
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Drift Simulation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="simulation-hours" className="text-sm font-medium">
              Simulation Period
            </Label>
            <span className="text-2xl font-bold text-primary" data-testid="text-simulation-hours">
              {hours}h
            </span>
          </div>
          <Slider
            id="simulation-hours"
            min={1}
            max={12}
            step={1}
            value={[hours]}
            onValueChange={([value]) => onHoursChange(value)}
            className="w-full"
            data-testid="slider-simulation-hours"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 hour</span>
            <span>6 hours</span>
            <span>12 hours</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Map className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show-heatmap" className="text-sm">
                Show Heatmap
              </Label>
            </div>
            <Switch
              id="show-heatmap"
              checked={showHeatmap}
              onCheckedChange={onShowHeatmapChange}
              data-testid="switch-show-heatmap"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Route className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show-paths" className="text-sm">
                Show Drift Paths
              </Label>
            </div>
            <Switch
              id="show-paths"
              checked={showPaths}
              onCheckedChange={onShowPathsChange}
              data-testid="switch-show-paths"
            />
          </div>
        </div>

        {!isDriftMode && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20" data-testid="alert-drift-mode-required">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Please trigger drift mode first to run simulation
            </p>
          </div>
        )}

        <Button
          className="w-full h-11"
          onClick={onRunSimulation}
          disabled={!canRun || isSimulating}
          data-testid="button-run-simulation"
        >
          {isSimulating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Drift Simulation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
