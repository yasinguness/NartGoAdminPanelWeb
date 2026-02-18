import { useState, useEffect } from 'react';
import {
  Typography,
  IconButton,
  Tooltip,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Info as InfoIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
} from '@mui/icons-material';

// New components
import { PageContainer, PageHeader } from '../components/Page';
import { DataTable, StatusChip } from '../components/Data';
import { FilterBar } from '../components/Filter';
import { FormSection, FormGrid } from '../components/Form';

interface Device {
  id: string;
  deviceId: string;
  deviceType: string;
  deviceModel: string;
  fcmToken: string;
  active: boolean;
  lastActiveAt: string;
  email?: string;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Simulated fetch
    const fetchDevices = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      // Mock data
      setDevices([
        {
          id: '1',
          deviceId: 'iphone-13-pro-max',
          deviceType: 'ios',
          deviceModel: 'iPhone 13 Pro Max',
          fcmToken: 'fcm-token-123...',
          active: true,
          lastActiveAt: new Date().toISOString(),
          email: 'user1@example.com'
        },
        {
          id: '2',
          deviceId: 'samsung-s22-ultra',
          deviceType: 'android',
          deviceModel: 'Samsung S22 Ultra',
          fcmToken: 'fcm-token-456...',
          active: false,
          lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
          email: 'user2@example.com'
        }
      ]);
      setLoading(false);
    };
    fetchDevices();
  }, []);

  const handleDeviceDetails = (device: Device) => {
    setSelectedDevice(device);
    setDialogOpen(true);
  };

  const filteredDevices = devices.filter(
    (device) =>
      device.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      device.deviceType.toLowerCase().includes(search.toLowerCase()) ||
      device.deviceModel.toLowerCase().includes(search.toLowerCase()) ||
      (device.email && device.email.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { 
      id: 'deviceId', 
      label: 'Device ID',
      render: (row: Device) => (
        <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
          {row.deviceId}
        </Typography>
      )
    },
    { id: 'deviceType', label: 'Type' },
    { id: 'deviceModel', label: 'Model' },
    { 
      id: 'email', 
      label: 'User',
      render: (row: Device) => row.email || 'Anonymous'
    },
    { 
      id: 'active', 
      label: 'Status',
      render: (row: Device) => (
        <StatusChip status={row.active ? 'active' : 'inactive'} />
      )
    },
    { 
      id: 'lastActiveAt', 
      label: 'Last Active',
      render: (row: Device) => new Date(row.lastActiveAt).toLocaleString()
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Devices"
        subtitle="Monitor and manage registered user devices"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Devices' }
        ]}
      />

      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by Device ID, Model, or User...'
        }}
      />

      <DataTable
        columns={columns}
        data={filteredDevices}
        loading={loading}
        onRowClick={handleDeviceDetails}
        renderRowActions={(device: Device) => (
          <Box display="flex" gap={0.5}>
            <Tooltip title="View Details">
              <IconButton size="small" onClick={() => handleDeviceDetails(device)}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={device.active ? 'Block Device' : 'Unblock Device'}>
              <IconButton size="small">
                {device.active ? <BlockIcon fontSize="small" /> : <ActiveIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        )}
      />

      {/* Device Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Device Information</DialogTitle>
        <DialogContent dividers>
          {selectedDevice && (
            <Box sx={{ mt: 1 }}>
              <FormSection title="General Information" showDivider={false}>
                <FormGrid>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Device ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedDevice.deviceId}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Device Model</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedDevice.deviceModel}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Device Type</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>{selectedDevice.deviceType}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Associated User</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedDevice.email || 'Anonymous'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Current Status</Typography>
                    <Box mt={0.5}>
                      <StatusChip status={selectedDevice.active ? 'active' : 'inactive'} showIcon />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Last Communication</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{new Date(selectedDevice.lastActiveAt).toLocaleString()}</Typography>
                  </Box>
                </FormGrid>
              </FormSection>

              <FormSection title="Technical Details" mt={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">FCM Token (Notification ID)</Typography>
                  <Typography
                    sx={{
                      p: 1.5,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      mt: 1
                    }}
                  >
                    {selectedDevice.fcmToken}
                  </Typography>
                </Box>
              </FormSection>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} color="inherit">
            Close
          </Button>
          <Button 
            variant="contained" 
            color={selectedDevice?.active ? 'error' : 'success'}
            startIcon={selectedDevice?.active ? <BlockIcon /> : <ActiveIcon />}
          >
            {selectedDevice?.active ? 'Block Device' : 'Unblock Device'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}