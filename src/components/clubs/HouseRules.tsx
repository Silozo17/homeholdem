import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollText, Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface Rule {
  id: string;
  title: string;
  content: string;
  display_order: number;
}

interface HouseRulesProps {
  clubId: string;
  isAdmin: boolean;
}

export function HouseRules({ clubId, isAdmin }: HouseRulesProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRules();
  }, [clubId]);

  const fetchRules = async () => {
    // Using type assertion since types may not be regenerated yet
    const { data, error } = await (supabase as any)
      .from('club_rules')
      .select('*')
      .eq('club_id', clubId)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setRules(data);
    }
    setLoading(false);
  };

  const openAddDialog = () => {
    setEditingRule(null);
    setTitle('');
    setContent('');
    setDialogOpen(true);
  };

  const openEditDialog = (rule: Rule) => {
    setEditingRule(rule);
    setTitle(rule.title);
    setContent(rule.content);
    setDialogOpen(true);
  };

  const saveRule = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    setSaving(true);

    if (editingRule) {
      // Using type assertion since types may not be regenerated yet
      const { error } = await (supabase as any)
        .from('club_rules')
        .update({ title: title.trim(), content: content.trim() })
        .eq('id', editingRule.id);

      if (error) {
        toast.error('Failed to update rule');
      } else {
        toast.success('Rule updated');
        fetchRules();
        setDialogOpen(false);
      }
    } else {
      const nextOrder = rules.length > 0 ? Math.max(...rules.map(r => r.display_order)) + 1 : 0;
      // Using type assertion since types may not be regenerated yet
      const { error } = await (supabase as any)
        .from('club_rules')
        .insert({
          club_id: clubId,
          title: title.trim(),
          content: content.trim(),
          display_order: nextOrder,
        });

      if (error) {
        toast.error('Failed to add rule');
      } else {
        toast.success('Rule added');
        fetchRules();
        setDialogOpen(false);
      }
    }

    setSaving(false);
  };

  const deleteRule = async (ruleId: string) => {
    // Using type assertion since types may not be regenerated yet
    const { error } = await (supabase as any)
      .from('club_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      toast.error('Failed to delete rule');
    } else {
      toast.success('Rule deleted');
      fetchRules();
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8">
          <div className="animate-pulse text-center text-muted-foreground">Loading rules...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            House Rules
          </CardTitle>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingRule ? 'Edit Rule' : 'Add House Rule'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Input
                      placeholder="Rule title (e.g., Late Registration)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Rule details..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button onClick={saveRule} disabled={saving} className="w-full">
                    {saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Add Rule'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2 opacity-30">📜</div>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'No house rules yet. Add your first rule!' : 'No house rules defined for this club.'}
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {rules.map((rule) => (
              <AccordionItem key={rule.id} value={rule.id}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center justify-between w-full pr-2">
                    <span>{rule.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <p className="text-muted-foreground whitespace-pre-wrap">{rule.content}</p>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openEditDialog(rule)}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
