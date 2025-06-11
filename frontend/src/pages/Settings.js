import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import { useQuery, useMutation } from 'react-query';
import api from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    duitku_merchant_code: '',
    duitku_api_key: '',
    duitku_environment: 'sandbox',
    thinkific_api_key: '',
    thinkific_subdomain: '',
    webhook_secret: '',
    auto_enrollment: true,
    email_notifications: true,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data: oauthStatus } = useQuery(
    'oauth-status',
    () => api.get(`/oauth/status/${settings.thinkific_subdomain}`).then(res => res.data),
    {
      enabled: !!settings.thinkific_subdomain,
      retry: false,
      onError: () => {
        // Status check might fail, that's ok
      }
    }
  );

  const saveSettingsMutation = useMutation(
    (settingsData) => api.post('/settings', settingsData),
    {
      onSuccess: () => {
        setSaved(true);
        setError('');
        setTimeout(() => setSaved(false), 3000);
      },
      onError: (err) => {
        setError(err.response?.data?.message || 'Failed to save settings');
      },
    }
  );

  const testConnectionMutation = useMutation(
    () => api.post('/test-connection'),
    {
      onSuccess: () => {
        setError('');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
      onError: (err) => {
        setError(err.response?.data?.message || 'Connection test failed');
      },
    }
  );

  const handleSave = (event) => {
    event.preventDefault();
    saveSettingsMutation.mutate(settings);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings({ ...settings, [field]: value });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* OAuth Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                OAuth Integration Status
              </Typography>
              {oauthStatus ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip 
                    label={oauthStatus.connected ? 'Connected' : 'Disconnected'} 
                    color={oauthStatus.connected ? 'success' : 'error'}
                  />
                  {oauthStatus.connected && (
                    <Typography variant="body2">
                      Connected to: {oauthStatus.subdomain}.thinkific.com
                    </Typography>
                  )}
                </Box>
              ) : (
                <Chip label="Not Connected" color="default" />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Duitku Configuration */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Duitku Configuration
            </Typography>
            
            <TextField
              label="Merchant Code"
              value={settings.duitku_merchant_code}
              onChange={handleInputChange('duitku_merchant_code')}
              fullWidth
              margin="normal"
              required
            />
            
            <TextField
              label="API Key"
              type="password"
              value={settings.duitku_api_key}
              onChange={handleInputChange('duitku_api_key')}
              fullWidth
              margin="normal"
              required
            />
            
            <TextField
              select
              label="Environment"
              value={settings.duitku_environment}
              onChange={handleInputChange('duitku_environment')}
              fullWidth
              margin="normal"
              SelectProps={{
                native: true,
              }}
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </TextField>
          </Paper>
        </Grid>

        {/* Thinkific Configuration */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Thinkific Configuration
            </Typography>
            
            <TextField
              label="API Key"
              type="password"
              value={settings.thinkific_api_key}
              onChange={handleInputChange('thinkific_api_key')}
              fullWidth
              margin="normal"
              required
            />
            
            <TextField
              label="Subdomain"
              value={settings.thinkific_subdomain}
              onChange={handleInputChange('thinkific_subdomain')}
              fullWidth
              margin="normal"
              required
              helperText="Enter your school subdomain (e.g., 'yourschool' for yourschool.thinkific.com)"
            />
          </Paper>
        </Grid>

        {/* Webhook Configuration */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Webhook Configuration
            </Typography>
            
            <TextField
              label="Webhook Secret"
              type="password"
              value={settings.webhook_secret}
              onChange={handleInputChange('webhook_secret')}
              fullWidth
              margin="normal"
              helperText="Secret key used to verify webhook signatures"
            />
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Configure the following webhook URLs in your Duitku and Thinkific dashboards:
            </Typography>
            
            <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                Duitku Callback URL: {process.env.REACT_APP_API_URL || window.location.origin}/webhooks/duitku/callback
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                Thinkific Webhook URL: {process.env.REACT_APP_API_URL || window.location.origin}/webhooks/thinkific
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Application Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Application Settings
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.auto_enrollment}
                  onChange={handleInputChange('auto_enrollment')}
                />
              }
              label="Automatic Course Enrollment"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.email_notifications}
                  onChange={handleInputChange('email_notifications')}
                />
              }
              label="Email Notifications"
            />
          </Paper>
        </Grid>

        {/* Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saveSettingsMutation.isLoading}
              >
                {saveSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isLoading}
              >
                {testConnectionMutation.isLoading ? 'Testing...' : 'Test Connection'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
