import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, PlusCircle, Trash2, Edit, CalendarDays, BookOpen, BookLock } from 'lucide-react';

const ConventionDatesManager = ({ user }) => {
  const [conventionDates, setConventionDates] = useState([]);
  const [showConventionDialog, setShowConventionDialog] = useState(false);
  const [currentConvention, setCurrentConvention] = useState({ 
    id: null, event_name: '', location: '', start_date: '', end_date: '', 
    accepting_bookings: true, is_fully_booked: false 
  });
  const [isEditingConvention, setIsEditingConvention] = useState(false);
  const [isConventionLoading, setIsConventionLoading] = useState(false);
  const { toast } = useToast();

  const fetchConventionDates = useCallback(async () => {
    if (!user?.id) {
      setConventionDates([]);
      setIsConventionLoading(false);
      return;
    }
    setIsConventionLoading(true);
    const { data, error } = await supabase
      .from('convention_dates')
      .select('*')
      .eq('artist_id', user.id)
      .order('start_date', { ascending: true });
    if (error) {
      toast({ title: "Error fetching convention dates", description: error.message, variant: "destructive" });
      setConventionDates([]);
    } else {
      setConventionDates(data || []);
    }
    setIsConventionLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchConventionDates();
  }, [fetchConventionDates]);

  const handleOpenConventionDialog = (convention = null) => {
    if (!user?.id) {
      toast({ title: "User not loaded", description: "Cannot manage convention dates without user data.", variant: "destructive" });
      return;
    }
    if (convention) {
      setCurrentConvention({
        id: convention.id,
        event_name: convention.event_name,
        location: convention.location,
        start_date: convention.start_date,
        end_date: convention.end_date || '',
        accepting_bookings: convention.accepting_bookings === null ? true : convention.accepting_bookings,
        is_fully_booked: convention.is_fully_booked || false,
      });
      setIsEditingConvention(true);
    } else {
      setCurrentConvention({ 
        id: null, event_name: '', location: '', start_date: '', end_date: '',
        accepting_bookings: true, is_fully_booked: false 
      });
      setIsEditingConvention(false);
    }
    setShowConventionDialog(true);
  };

  const handleSaveConvention = async () => {
    if (!user?.id || !currentConvention.event_name || !currentConvention.location || !currentConvention.start_date) {
      toast({ title: "Missing fields", description: "Event name, location, and start date are required.", variant: "destructive" });
      return;
    }
    setIsConventionLoading(true);
    const payload = {
      artist_id: user.id,
      event_name: currentConvention.event_name.trim(),
      location: currentConvention.location.trim(),
      start_date: currentConvention.start_date,
      end_date: currentConvention.end_date || null,
      accepting_bookings: currentConvention.accepting_bookings,
      is_fully_booked: currentConvention.is_fully_booked,
    };

    let error;
    if (isEditingConvention && currentConvention.id) {
      payload.updated_at = new Date().toISOString();
      const { error: updateError } = await supabase.from('convention_dates').update(payload).eq('id', currentConvention.id).select();
      error = updateError;
    } else {
      payload.created_at = new Date().toISOString();
      payload.updated_at = new Date().toISOString(); 
      const { error: insertError } = await supabase.from('convention_dates').insert(payload).select();
      error = insertError;
    }

    if (error) {
      toast({ title: "Error saving convention", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Convention ${isEditingConvention ? 'updated' : 'added'}!`, variant: "default" });
      setShowConventionDialog(false);
      fetchConventionDates();
    }
    setIsConventionLoading(false);
  };

  const handleDeleteConvention = async (conventionId) => {
    setIsConventionLoading(true);
    const { error } = await supabase.from('convention_dates').delete().eq('id', conventionId);
    if (error) {
      toast({ title: "Error deleting convention", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Convention deleted", variant: "default" });
      fetchConventionDates();
    }
    setIsConventionLoading(false);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return ''; 
      return date.toISOString().split('T')[0];
    } catch (e) {
      return ''; 
    }
  };

  return (
    <div className="mt-8 p-6 glass-effect rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-primary" /> Convention Dates</h2>
        <Button onClick={() => handleOpenConventionDialog()} className="ink-gradient" disabled={!user?.id || isConventionLoading}>
          <PlusCircle className="w-4 h-4 mr-2" /> Add Date
        </Button>
      </div>
      {isConventionLoading && conventionDates.length === 0 ? (
        <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
      ) : conventionDates.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No convention dates added yet.</p>
      ) : (
        <div className="space-y-4">
          {conventionDates.map(conv => (
            <div key={conv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-border/50 rounded-md gap-2">
              <div>
                <p className="font-medium">{conv.event_name}</p>
                <p className="text-sm text-muted-foreground">{conv.location} &bull; {formatDateForInput(conv.start_date)} {conv.end_date ? `- ${formatDateForInput(conv.end_date)}` : ''}</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  {conv.accepting_bookings ? (
                    conv.is_fully_booked ? (
                      <span className="flex items-center text-orange-500"><BookLock className="w-3 h-3 mr-1" /> Fully Booked</span>
                    ) : (
                      <span className="flex items-center text-green-500"><BookOpen className="w-3 h-3 mr-1" /> Accepting Bookings</span>
                    )
                  ) : (
                    <span className="flex items-center text-red-500"><BookLock className="w-3 h-3 mr-1" /> Bookings Closed</span>
                  )}
                </div>
              </div>
              <div className="space-x-2 self-start sm:self-center">
                <Button variant="ghost" size="icon" onClick={() => handleOpenConventionDialog(conv)} disabled={isConventionLoading}><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteConvention(conv.id)} className="text-destructive hover:text-destructive/80" disabled={isConventionLoading}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showConventionDialog} onOpenChange={setShowConventionDialog}>
        <DialogContent className="glass-effect">
          <DialogHeader>
            <DialogTitle>{isEditingConvention ? 'Edit' : 'Add'} Convention Date</DialogTitle>
            <DialogDescription>Manage event details and booking availability.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="conv-event-name">Event Name</Label>
              <Input id="conv-event-name" value={currentConvention.event_name} onChange={e => setCurrentConvention({ ...currentConvention, event_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="conv-location">Location</Label>
              <Input id="conv-location" value={currentConvention.location} onChange={e => setCurrentConvention({ ...currentConvention, location: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="conv-start-date">Start Date</Label>
                <Input id="conv-start-date" type="date" value={formatDateForInput(currentConvention.start_date)} onChange={e => setCurrentConvention({ ...currentConvention, start_date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="conv-end-date">End Date (Optional)</Label>
                <Input id="conv-end-date" type="date" value={formatDateForInput(currentConvention.end_date)} onChange={e => setCurrentConvention({ ...currentConvention, end_date: e.target.value })} min={currentConvention.start_date || ''} />
              </div>
            </div>
            <div className="space-y-2 pt-2">
                <div className="flex items-center space-x-2">
                    <Checkbox 
                        id="accepting-bookings" 
                        checked={currentConvention.accepting_bookings} 
                        onCheckedChange={checked => setCurrentConvention(prev => ({ ...prev, accepting_bookings: !!checked, is_fully_booked: !checked ? false : prev.is_fully_booked }))} 
                    />
                    <Label htmlFor="accepting-bookings" className="font-normal">Accepting Bookings for this event</Label>
                </div>
                {currentConvention.accepting_bookings && (
                    <div className="flex items-center space-x-2 pl-6">
                        <Checkbox 
                            id="is-fully-booked" 
                            checked={currentConvention.is_fully_booked} 
                            onCheckedChange={checked => setCurrentConvention(prev => ({ ...prev, is_fully_booked: !!checked }))} 
                        />
                        <Label htmlFor="is-fully-booked" className="font-normal">Mark as Fully Booked</Label>
                    </div>
                )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isConventionLoading}>Cancel</Button></DialogClose>
            <Button onClick={handleSaveConvention} className="ink-gradient" disabled={isConventionLoading}>
              {isConventionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditingConvention ? 'Save Changes' : 'Add Date')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConventionDatesManager;