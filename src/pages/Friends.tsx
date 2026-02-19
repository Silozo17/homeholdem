import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendship } from '@/hooks/useFriendship';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MessageSquare, UserMinus, Check, X, Clock, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TappablePlayer } from '@/components/common/TappablePlayer';
import { HeaderSocialIcons } from '@/components/layout/HeaderSocialIcons';

export default function Friends() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { friends, pendingReceived, pendingSent, loading, acceptRequest, declineRequest, removeFriend, cancelRequest } = useFriendship();

  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="flex items-center gap-3 h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground flex-1">Friends</h1>
          <HeaderSocialIcons />
        </div>
      </header>
      <div className="h-14 safe-area-top" />

      <main className="px-4 py-3 pb-24">
        <Tabs defaultValue="friends">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="friends" className="flex-1">
              Friends {friends.length > 0 && `(${friends.length})`}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1">
              Requests {pendingReceived.length > 0 && `(${pendingReceived.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse">Loading...</div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground">No friends yet</p>
                <p className="text-xs text-muted-foreground/60">Add friends by tapping players at the poker table</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <TappablePlayer key={friend.friendship_id} userId={friend.user_id}>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friend.avatar_url ?? undefined} />
                      <AvatarFallback>{friend.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium text-sm truncate">{friend.display_name}</span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => navigate(`/inbox?user=${friend.user_id}`)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={async () => {
                          await removeFriend(friend.friendship_id);
                          toast({ title: 'Friend removed' });
                        }}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  </TappablePlayer>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            {pendingReceived.length === 0 && pendingSent.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No pending requests</div>
            ) : (
              <div className="space-y-4">
                {pendingReceived.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Incoming</h3>
                    <div className="space-y-2">
                      {pendingReceived.map((req) => (
                        <div key={req.friendship_id} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={req.avatar_url ?? undefined} />
                            <AvatarFallback>{req.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="flex-1 font-medium text-sm truncate">{req.display_name}</span>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="default"
                              className="h-8 w-8"
                              onClick={async () => {
                                await acceptRequest(req.friendship_id);
                                toast({ title: 'Friend added!' });
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={async () => {
                                await declineRequest(req.friendship_id);
                                toast({ title: 'Request declined' });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingSent.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sent</h3>
                    <div className="space-y-2">
                      {pendingSent.map((req) => (
                        <div key={req.friendship_id} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={req.avatar_url ?? undefined} />
                            <AvatarFallback>{req.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="flex-1 font-medium text-sm truncate">{req.display_name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs gap-1"
                            onClick={async () => {
                              await cancelRequest(req.friendship_id);
                              toast({ title: 'Request cancelled' });
                            }}
                          >
                            <Clock className="h-3 w-3" /> Cancel
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
