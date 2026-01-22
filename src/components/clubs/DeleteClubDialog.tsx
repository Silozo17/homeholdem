import { useState } from 'react';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DeleteClubDialogProps {
  clubId: string;
  clubName: string;
}

export function DeleteClubDialog({ clubId, clubName }: DeleteClubDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const isConfirmed = confirmText.toLowerCase() === 'delete';

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', clubId);

      if (error) throw error;

      toast.success('Club deleted successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete club:', error);
      toast.error('Failed to delete club');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Club
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {clubName}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action is <strong className="text-foreground">permanent</strong> and cannot be undone.
            </p>
            <p>This will delete:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>All events and game history</li>
              <li>All member data and roles</li>
              <li>All chat messages</li>
              <li>Season standings and statistics</li>
            </ul>
            <p className="pt-2">
              Type <strong className="text-foreground">delete</strong> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className="mt-2"
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => setConfirmText('')}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Club
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
