import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Loader2 } from 'lucide-react';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const AvailabilityManager = () => {
    const { user, updateUser } = useAuth();
    const { toast } = useToast();
    const [availability, setAvailability] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const initialAvailability = daysOfWeek.reduce((acc, day) => {
            acc[day] = { active: false, start: '09:00', end: '17:00' };
            return acc;
        }, {});

        const userAvailability = user?.profile?.general_availability || {};
        
        // Merge saved data with initial structure
        Object.keys(userAvailability).forEach(day => {
            if (initialAvailability[day]) {
                initialAvailability[day] = { ...initialAvailability[day], ...userAvailability[day] };
            }
        });

        setAvailability(initialAvailability);

    }, [user]);

    const handleDayToggle = (day) => {
        setAvailability(prev => ({
            ...prev,
            [day]: { ...prev[day], active: !prev[day].active }
        }));
    };

    const handleTimeChange = (day, type, value) => {
        setAvailability(prev => ({
            ...prev,
            [day]: { ...prev[day], [type]: value }
        }));
    };

    const handleSaveAvailability = async () => {
        setIsSaving(true);
        try {
            const { error } = await updateUser({ general_availability: availability });
            if (error) throw error;
            toast({ title: "Availability Saved!", description: "Your general booking hours have been updated." });
        } catch (error) {
            toast({ title: "Error", description: `Could not save availability: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="mt-8 p-6 glass-effect rounded-xl">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-primary" /> General Availability
            </h2>
            <div className="space-y-4">
                {daysOfWeek.map(day => (
                    <div key={day} className="p-3 border border-border/50 rounded-md space-y-2">
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id={`check-${day}`}
                                checked={availability[day]?.active || false}
                                onCheckedChange={() => handleDayToggle(day)}
                            />
                            <Label htmlFor={`check-${day}`} className="capitalize text-md font-medium">{day}</Label>
                        </div>
                        {availability[day]?.active && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                                <div>
                                    <Label htmlFor={`start-${day}`} className="text-xs">Start Time</Label>
                                    <Input
                                        id={`start-${day}`}
                                        type="time"
                                        value={availability[day]?.start || ''}
                                        onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`end-${day}`} className="text-xs">End Time</Label>
                                    <Input
                                        id={`end-${day}`}
                                        type="time"
                                        value={availability[day]?.end || ''}
                                        onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-6">
                <Button onClick={handleSaveAvailability} disabled={isSaving} className="ink-gradient">
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save General Availability
                </Button>
            </div>
        </div>
    );
};

export default AvailabilityManager;
