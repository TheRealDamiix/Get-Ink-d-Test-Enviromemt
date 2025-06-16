import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, Bell, Palette } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

const SettingsPage = () => {
  const { toast } = useToast();

  const handleFeatureClick = (featureName) => {
    toast({
      title: `🚧 ${featureName} Settings`,
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      duration: 5000,
    });
  };

  const settingsOptions = [
    { name: "Account", icon: Settings, description: "Manage your account details and preferences." },
    { name: "Security", icon: Shield, description: "Update your password and manage security settings." },
    { name: "Notifications", icon: Bell, description: "Configure your notification preferences." },
    { name: "Appearance", icon: Palette, description: "Customize the look and feel of the app." },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto max-w-3xl"
      >
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold ink-text-gradient">Settings</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsOptions.map((option) => (
            <motion.div
              key={option.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="glass-effect p-6 rounded-xl hover:border-primary/50 transition-all"
            >
              <div className="flex items-center mb-3">
                <option.icon className="w-6 h-6 text-primary mr-3" />
                <h2 className="text-xl font-semibold">{option.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
              <Button variant="outline" onClick={() => handleFeatureClick(option.name)}>
                Manage {option.name}
              </Button>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground">
            More settings and customization options coming soon to InkSnap!
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;