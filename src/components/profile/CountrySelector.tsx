import { useState } from 'react';
import { COUNTRIES, isoToEmoji } from '@/lib/countries';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountrySelectorProps {
  value: string | null;
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CountrySelector({ value, onChange, className, disabled }: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('justify-between gap-2 font-normal', className)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span className="text-base leading-none">{isoToEmoji(selected.code)}</span>
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              Select country
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onChange(country.code);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <span className="text-base leading-none">{isoToEmoji(country.code)}</span>
                  <span className="truncate">{country.name}</span>
                  {value === country.code && (
                    <span className="ml-auto text-primary text-xs">✓</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
