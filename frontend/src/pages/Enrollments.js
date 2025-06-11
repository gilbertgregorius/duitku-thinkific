import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Visibility, Edit, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';

const Enrollments = () => {
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: enrollments = [], isLoading, error } = useQuery(
    ['enrollments', filterStatus],
    () => {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      return api.get(`/enrollments${params}`).then(res => res.data);
    },
    { refetchInterval: 30000 }
  );

  const updateEnrollmentMutation = useMutation(
    (enrollmentData) => api.put(`/enrollments/${enrollmentData.id}`, enrollmentData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('enrollments');
        setEditDialog(false);
        setSelectedEnrollment(null);
      },
    }
  );

  const deleteEnrollmentMutation = useMutation(
    (enrollmentId) => api.delete(`/enrollments/${enrollmentId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('enrollments');
        setDeleteDialog(false);
        setSelectedEnrollment(null);
      },
    }
  );

  const columns = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'user_email', headerName: 'User Email', width: 200 },
    { field: 'course_name', headerName: 'Course', width: 200 },
    { field: 'thinkific_user_id', headerName: 'Thinkific User ID', width: 150 },
    { field: 'thinkific_course_id', headerName: 'Course ID', width: 120 },
    {
      field: 'enrollment_status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value || 'active'}
          color={
            (params.value || 'active') === 'active' ? 'success' :
            (params.value || 'active') === 'suspended' ? 'warning' : 'error'
          }
          size="small"
        />
      ),
    },
    {
      field: 'enrolled_at',
      headerName: 'Enrolled At',
      width: 160,
      renderCell: (params) => params.value ? new Date(params.value).toLocaleString() : '-',
    },
    {
      field: 'progress',
      headerName: 'Progress',
      width: 100,
      renderCell: (params) => `${params.value || 0}%`,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedEnrollment(params.row);
              setEditDialog(true);
            }}
          >
            <Visibility />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedEnrollment(params.row);
              setEditDialog(true);
            }}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedEnrollment(params.row);
              setDeleteDialog(true);
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  const handleUpdateEnrollment = (event) => {
    event.preventDefault();
    updateEnrollmentMutation.mutate(selectedEnrollment);
  };

  const handleDeleteEnrollment = () => {
    deleteEnrollmentMutation.mutate(selectedEnrollment.id);
  };

  if (error) {
    return (
      <Alert severity="error">
        Failed to load enrollments: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Enrollments Management
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          select
          label="Filter by Status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">All Enrollments</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="suspended">Suspended</MenuItem>
          <MenuItem value="expired">Expired</MenuItem>
        </TextField>
        <Typography variant="body2" color="textSecondary">
          Total: {enrollments.length} enrollments
        </Typography>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={enrollments}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          loading={isLoading}
          sx={{
            '& .MuiDataGrid-cell:hover': {
              color: 'primary.main',
            },
          }}
        />
      </Paper>

      {/* Edit/View Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleUpdateEnrollment}>
          <DialogTitle>
            {selectedEnrollment ? `Enrollment #${selectedEnrollment.id}` : 'Enrollment Details'}
          </DialogTitle>
          <DialogContent>
            {selectedEnrollment && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                  label="User Email"
                  value={selectedEnrollment.user_email || ''}
                  onChange={(e) => setSelectedEnrollment({...selectedEnrollment, user_email: e.target.value})}
                  fullWidth
                  disabled
                />
                <TextField
                  label="Course Name"
                  value={selectedEnrollment.course_name || ''}
                  onChange={(e) => setSelectedEnrollment({...selectedEnrollment, course_name: e.target.value})}
                  fullWidth
                  disabled
                />
                <TextField
                  label="Thinkific User ID"
                  value={selectedEnrollment.thinkific_user_id || ''}
                  onChange={(e) => setSelectedEnrollment({...selectedEnrollment, thinkific_user_id: e.target.value})}
                  fullWidth
                  disabled
                />
                <TextField
                  label="Thinkific Course ID"
                  value={selectedEnrollment.thinkific_course_id || ''}
                  onChange={(e) => setSelectedEnrollment({...selectedEnrollment, thinkific_course_id: e.target.value})}
                  fullWidth
                  disabled
                />
                <TextField
                  select
                  label="Enrollment Status"
                  value={selectedEnrollment.enrollment_status || 'active'}
                  onChange={(e) => setSelectedEnrollment({...selectedEnrollment, enrollment_status: e.target.value})}
                  fullWidth
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                </TextField>
                <TextField
                  label="Progress (%)"
                  type="number"
                  value={selectedEnrollment.progress || 0}
                  onChange={(e) => setSelectedEnrollment({...selectedEnrollment, progress: parseFloat(e.target.value)})}
                  fullWidth
                  inputProps={{ min: 0, max: 100 }}
                />
                <TextField
                  label="Enrolled At"
                  type="datetime-local"
                  value={selectedEnrollment.enrolled_at ? new Date(selectedEnrollment.enrolled_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setSelectedEnrollment({...selectedEnrollment, enrolled_at: e.target.value})}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={updateEnrollmentMutation.isLoading}
            >
              {updateEnrollmentMutation.isLoading ? 'Updating...' : 'Update Enrollment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Enrollment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete enrollment #{selectedEnrollment?.id}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteEnrollment}
            color="error"
            variant="contained"
            disabled={deleteEnrollmentMutation.isLoading}
          >
            {deleteEnrollmentMutation.isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Enrollments;
