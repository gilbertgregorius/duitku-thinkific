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

const Orders = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, error } = useQuery(
    ['orders', filterStatus],
    () => {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      return api.get(`/orders${params}`).then(res => res.data);
    },
    { refetchInterval: 30000 }
  );

  const updateOrderMutation = useMutation(
    (orderData) => api.put(`/orders/${orderData.id}`, orderData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('orders');
        setEditDialog(false);
        setSelectedOrder(null);
      },
    }
  );

  const deleteOrderMutation = useMutation(
    (orderId) => api.delete(`/orders/${orderId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('orders');
        setDeleteDialog(false);
        setSelectedOrder(null);
      },
    }
  );

  const columns = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'user_email', headerName: 'Email', width: 200 },
    { field: 'course_name', headerName: 'Course', width: 200 },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      renderCell: (params) => `Rp ${(params.value || 0).toLocaleString()}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'completed' ? 'success' :
            params.value === 'pending' ? 'warning' : 'error'
          }
          size="small"
        />
      ),
    },
    {
      field: 'payment_method',
      headerName: 'Payment Method',
      width: 150,
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 160,
      renderCell: (params) => new Date(params.value).toLocaleString(),
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
              setSelectedOrder(params.row);
              setEditDialog(true);
            }}
          >
            <Visibility />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedOrder(params.row);
              setEditDialog(true);
            }}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedOrder(params.row);
              setDeleteDialog(true);
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  const handleUpdateOrder = (event) => {
    event.preventDefault();
    updateOrderMutation.mutate(selectedOrder);
  };

  const handleDeleteOrder = () => {
    deleteOrderMutation.mutate(selectedOrder.id);
  };

  if (error) {
    return (
      <Alert severity="error">
        Failed to load orders: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Orders Management
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
          <MenuItem value="all">All Orders</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="failed">Failed</MenuItem>
        </TextField>
        <Typography variant="body2" color="textSecondary">
          Total: {orders.length} orders
        </Typography>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={orders}
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
        <form onSubmit={handleUpdateOrder}>
          <DialogTitle>
            {selectedOrder ? `Order #${selectedOrder.id}` : 'Order Details'}
          </DialogTitle>
          <DialogContent>
            {selectedOrder && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                  label="User Email"
                  value={selectedOrder.user_email || ''}
                  onChange={(e) => setSelectedOrder({...selectedOrder, user_email: e.target.value})}
                  fullWidth
                  disabled
                />
                <TextField
                  label="Course Name"
                  value={selectedOrder.course_name || ''}
                  onChange={(e) => setSelectedOrder({...selectedOrder, course_name: e.target.value})}
                  fullWidth
                />
                <TextField
                  label="Amount"
                  type="number"
                  value={selectedOrder.amount || ''}
                  onChange={(e) => setSelectedOrder({...selectedOrder, amount: parseFloat(e.target.value)})}
                  fullWidth
                />
                <TextField
                  select
                  label="Status"
                  value={selectedOrder.status || ''}
                  onChange={(e) => setSelectedOrder({...selectedOrder, status: e.target.value})}
                  fullWidth
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="refunded">Refunded</MenuItem>
                </TextField>
                <TextField
                  label="Payment Method"
                  value={selectedOrder.payment_method || ''}
                  onChange={(e) => setSelectedOrder({...selectedOrder, payment_method: e.target.value})}
                  fullWidth
                />
                <TextField
                  label="Transaction ID"
                  value={selectedOrder.duitku_transaction_id || ''}
                  onChange={(e) => setSelectedOrder({...selectedOrder, duitku_transaction_id: e.target.value})}
                  fullWidth
                  disabled
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={updateOrderMutation.isLoading}
            >
              {updateOrderMutation.isLoading ? 'Updating...' : 'Update Order'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete order #{selectedOrder?.id}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteOrder}
            color="error"
            variant="contained"
            disabled={deleteOrderMutation.isLoading}
          >
            {deleteOrderMutation.isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Orders;
