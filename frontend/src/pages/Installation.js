import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Link,
} from '@mui/material';

const steps = ['Enter Subdomain', 'Install App', 'Confirmation'];

const Installation = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installUrl, setInstallUrl] = useState('');

  const handleInstall = async () => {
    if (!subdomain.trim()) {
      setError('Please enter your Thinkific subdomain');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Redirect to OAuth install endpoint
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const url = `${baseUrl}/oauth/install?subdomain=${encodeURIComponent(subdomain)}`;
      setInstallUrl(url);
      setActiveStep(1);
    } catch (err) {
      setError('Failed to initiate installation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setSubdomain('');
    setError('');
    setInstallUrl('');
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Enter your Thinkific school subdomain to begin the installation process.
            </Typography>
            <TextField
              label="Thinkific Subdomain"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="yourschool"
              fullWidth
              sx={{ mt: 2, mb: 2 }}
              helperText="Enter just the subdomain part (e.g., 'yourschool' for yourschool.thinkific.com)"
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Button
              variant="contained"
              onClick={handleInstall}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Preparing Installation...' : 'Start Installation'}
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Click the button below to authorize the Duitku-Thinkific integration with your Thinkific account.
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              You will be redirected to Thinkific to complete the authorization process.
            </Alert>
            <Button
              variant="contained"
              component={Link}
              href={installUrl}
              target="_self"
              fullWidth
              sx={{ mb: 2 }}
            >
              Authorize with Thinkific
            </Button>
            <Button
              variant="outlined"
              onClick={handleNext}
              fullWidth
            >
              I've completed the authorization
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Installation completed successfully!
            </Alert>
            <Typography variant="body1" gutterBottom>
              Your Duitku-Thinkific integration is now active. You can:
            </Typography>
            <ul>
              <li>Process payments through Duitku</li>
              <li>Automatically enroll students in courses</li>
              <li>Monitor orders and enrollments through this dashboard</li>
            </ul>
            <Button
              variant="contained"
              onClick={handleReset}
              sx={{ mt: 2 }}
            >
              Install Another School
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        App Installation
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            About This Integration
          </Typography>
          <Typography variant="body2" color="textSecondary">
            The Duitku-Thinkific Partner App enables seamless payment processing and automatic course enrollment. 
            This integration allows your students to pay for courses using Duitku's payment methods and get automatically 
            enrolled in your Thinkific courses upon successful payment.
          </Typography>
        </CardContent>
      </Card>

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}
      </Paper>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Need Help?
          </Typography>
          <Typography variant="body2" color="textSecondary">
            If you encounter any issues during installation, please contact our support team or 
            refer to the documentation for troubleshooting steps.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Installation;
