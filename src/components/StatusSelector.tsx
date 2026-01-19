// src/components/StatusSelector.tsx
"use client";

import { PropertyStatus, type PropertyStatus as PropertyStatusType } from "@/definitions/property";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  PropertyStatusType,
  { label: string; className: string; selectClassName: string }
> = {
  saved: {
    label: "Saved",
    className: "bg-muted text-muted-foreground border-border",
    selectClassName: "text-muted-foreground",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    selectClassName: "text-destructive",
  },
  shortlisted: {
    label: "Shortlisted",
    className: "bg-[#C35A38]/10 text-[#C35A38] border-[#C35A38]/20",
    selectClassName: "text-[#C35A38]",
  },
  inspected: {
    label: "Inspected",
    className: "bg-[#7D9082]/10 text-[#5A6B5E] border-[#7D9082]/20",
    selectClassName: "text-[#5A6B5E]",
  },
  offered: {
    label: "Offered",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    selectClassName: "text-amber-700",
  },
  purchased: {
    label: "Purchased",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    selectClassName: "text-emerald-700",
  },
};

interface StatusSelectorProps {
  status: PropertyStatusType | string;
  onStatusChange: (status: PropertyStatusType) => void;
  disabled?: boolean;
}

export function StatusSelector({ status, onStatusChange, disabled }: StatusSelectorProps) {
  const config = statusConfig[status as PropertyStatusType] ?? statusConfig.saved;

  return (
    <Select
      value={status}
      onValueChange={(value) => onStatusChange(value as PropertyStatusType)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "h-7 w-[110px] text-xs font-medium rounded-full border px-2.5 py-0.5",
          config.className,
          "focus:ring-0 focus:ring-offset-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {PropertyStatus.options.map((statusOption) => {
          const optConfig = statusConfig[statusOption];
          return (
            <SelectItem
              key={statusOption}
              value={statusOption}
              className={cn("text-xs", optConfig.selectClassName)}
            >
              {optConfig.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
