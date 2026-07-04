import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, DollarSign, Users, CheckSquare, Check, X, 
  LogOut, PlusCircle, Settings, FileText, Menu, ChevronRight, Award, Edit2,
  ArrowLeft, Eye
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, 
  Title, Tooltip, Legend, Filler
);

export default function AdminDashboard({ user, onLogout, showToast }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarActive, setSidebarActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  
  // Database States
  const [sales, setSales] = useState([]);
  const [profiles, setProfiles] = useState([]);
  
  // Form States
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState('employee');
  const [newUserTarget, setNewUserTarget] = useState('5000');
  const [submittingUser, setSubmittingUser] = useState(false);
  
  // Target Modifying States
  const [editingTargetId, setEditingTargetId] = useState(null);
  const [editingTargetValue, setEditingTargetValue] = useState('');

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profiles
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (profileErr) throw profileErr;
      setProfiles(profileData || []);

      // 2. Fetch All Sales
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select(`
          *,
          profiles:employee_id (full_name, email)
        `)
        .order('sale_date', { ascending: false });
      if (salesErr) throw salesErr;
      setSales(salesData || []);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      showToast('Error loading database tables.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up Real-Time DB Subscriptions for Sales updates
    const salesChannel = supabase
      .channel('admin-sales-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, []);

  // Handle Approvals
  const handleApprove = async (saleId) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ status: 'approved', approved_by: user.id })
        .eq('id', saleId);
      
      if (error) throw error;
      showToast('Sale approved successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Error approving sale.', 'danger');
    }
  };

  const handleReject = async (saleId) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ status: 'rejected', approved_by: user.id })
        .eq('id', saleId);
      
      if (error) throw error;
      showToast('Sale rejected.', 'warning');
    } catch (err) {
      showToast(err.message || 'Error rejecting sale.', 'danger');
    }
  };

  // Handle Targets Edit
  const handleSaveTarget = async (profileId) => {
    const numericTarget = parseFloat(editingTargetValue);
    if (isNaN(numericTarget) || numericTarget < 0) {
      showToast('Please enter a valid target amount.', 'warning');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ monthly_target: numericTarget })
        .eq('id', profileId);

      if (error) throw error;
      showToast('Monthly target updated successfully.', 'success');
      setEditingTargetId(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Error updating target.', 'danger');
    }
  };

  // Handle toggling user role
  const handleToggleRole = async (targetProfile) => {
    if (targetProfile.id === user.id) {
      showToast("You cannot change your own role.", "warning");
      return;
    }

    const newRole = targetProfile.role === 'admin' ? 'employee' : 'admin';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetProfile.id);

      if (error) throw error;
      showToast(`Role updated to ${newRole} for ${targetProfile.full_name}.`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Error updating user role.', 'danger');
    }
  };

  // Handle New User Account Creation
  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (submittingUser) return;

    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      showToast('Please complete all required fields.', 'warning');
      return;
    }

    setSubmittingUser(true);
    try {
      // 1. Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail.trim().toLowerCase());

      if (checkError) throw checkError;
      if (existingUser && existingUser.length > 0) {
        showToast('A user with this email already exists.', 'warning');
        setSubmittingUser(false);
        return;
      }

      // 2. Insert new user profile directly
      // Accounts created by admins are automatically marked as verified
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            email: newUserEmail.trim().toLowerCase(),
            password: newUserPassword,
            full_name: newUserFullName,
            role: newUserRole,
            monthly_target: newUserRole === 'employee' ? parseFloat(newUserTarget) || 0 : 0,
            is_verified: true
          }
        ]);

      if (insertError) throw insertError;
      
      showToast(`Account created successfully for ${newUserFullName}.`, 'success');
      
      // Reset forms
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserTarget('5000');
      
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to register account.', 'danger');
    } finally {
      setSubmittingUser(false);
    }
  };

  // --- ANALYTICS CALCULATIONS ---
  const approvedSales = sales.filter(s => s.status === 'approved');
  const pendingSales = sales.filter(s => s.status === 'pending');
  
  const totalRevenue = approvedSales.reduce((acc, curr) => acc + parseFloat(curr.total_amount || 0), 0);
  const averageSale = approvedSales.length > 0 ? totalRevenue / approvedSales.length : 0;
  
  // Calculate employee sales aggregations
  const employeePerformance = profiles
    .filter(p => p.role === 'employee')
    .map(p => {
      const empSales = approvedSales.filter(s => s.employee_id === p.id);
      const totalAmount = empSales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
      const targetPercent = p.monthly_target > 0 ? (totalAmount / p.monthly_target) * 100 : 0;
      return {
        ...p,
        totalSalesCount: empSales.length,
        totalSalesValue: totalAmount,
        targetProgressPercent: Math.min(100, targetPercent)
      };
    })
    .sort((a, b) => b.totalSalesValue - a.totalSalesValue);

  // Top Performer
  const topPerformer = employeePerformance.length > 0 ? employeePerformance[0] : null;

  // Chart Data: Sales Trend over last 7 days (or entries)
  const getChartData = () => {
    // Group sales by date
    const dateMap = {};
    // Last 7 days sequence
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dString = d.toISOString().split('T')[0];
      dateMap[dString] = 0;
    }

    approvedSales.forEach(s => {
      const dateStr = s.sale_date;
      if (dateMap[dateStr] !== undefined) {
        dateMap[dateStr] += parseFloat(s.total_amount || 0);
      }
    });

    const labels = Object.keys(dateMap).map(dateStr => {
      const [, m, d] = dateStr.split('-');
      return `${m}/${d}`;
    });
    
    return {
      labels,
      datasets: [
        {
          fill: true,
          label: 'Daily Revenue ($)',
          data: Object.values(dateMap),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    };
  };

  // Doughnut Chart Data: Product Sales Distribution
  const getProductData = () => {
    const productMap = {};
    approvedSales.forEach(s => {
      const prod = s.product_name || 'Other';
      productMap[prod] = (productMap[prod] || 0) + parseFloat(s.total_amount || 0);
    });

    const sortedProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    return {
      labels: sortedProducts.map(p => p[0]),
      datasets: [
        {
          data: sortedProducts.map(p => p[1]),
          backgroundColor: [
            '#8b5cf6',
            '#d946ef',
            '#3b82f6',
            '#10b981',
            '#f59e0b'
          ],
          borderColor: 'rgba(20, 21, 33, 0.8)',
          borderWidth: 2,
        }
      ]
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#161722',
        titleFont: { family: 'Outfit', size: 13 },
        bodyFont: { family: 'Outfit', size: 12 },
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
      }
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="sidebar-brand">
          <div className="brand-icon">A</div>
          <span className="brand-name">AuraSales</span>
        </div>
        <button className="menu-toggle" onClick={() => setSidebarActive(!sidebarActive)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarActive ? 'active' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">A</div>
          <span className="brand-name">AuraSales</span>
        </div>

        <ul className="sidebar-menu">
          <li className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
            <button onClick={() => { setActiveTab('dashboard'); setSidebarActive(false); setSelectedEmployeeId(null); }}>
              <TrendingUp size={18} />
              <span>Dashboard</span>
            </button>
          </li>
          <li className={`menu-item ${activeTab === 'approvals' ? 'active' : ''}`}>
            <button onClick={() => { setActiveTab('approvals'); setSidebarActive(false); setSelectedEmployeeId(null); }}>
              <CheckSquare size={18} />
              <span>Approvals ({pendingSales.length})</span>
            </button>
          </li>
          <li className={`menu-item ${activeTab === 'targets' ? 'active' : ''}`}>
            <button onClick={() => { setActiveTab('targets'); setSidebarActive(false); setSelectedEmployeeId(null); }}>
              <Settings size={18} />
              <span>Targets Editor</span>
            </button>
          </li>
          <li className={`menu-item ${activeTab === 'users' ? 'active' : ''}`}>
            <button onClick={() => { setActiveTab('users'); setSidebarActive(false); setSelectedEmployeeId(null); }}>
              <Users size={18} />
              <span>User Directory</span>
            </button>
          </li>
        </ul>

        <div className="sidebar-user">
          <div className="user-avatar">{user.email.charAt(0)}</div>
          <div className="user-info">
            <div className="user-name">{user.user_metadata?.full_name || 'Admin User'}</div>
            <div className="user-role">Administrator</div>
          </div>
          <button className="btn-logout" onClick={onLogout} aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {loading ? (
          <div className="page-loader">
            <div className="loader"></div>
            <p>Syncing data with Supabase...</p>
          </div>
        ) : selectedEmployeeId ? (
          (() => {
            const empProfile = profiles.find(p => p.id === selectedEmployeeId);
            if (!empProfile) {
              return (
                <div>
                  <button className="btn-secondary" onClick={() => setSelectedEmployeeId(null)}>
                    <ArrowLeft size={16} />
                    <span>Back to Dashboard</span>
                  </button>
                  <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>Employee profile not found.</p>
                </div>
              );
            }

            const empSales = sales.filter(s => s.employee_id === selectedEmployeeId);
            const empApprovedSales = empSales.filter(s => s.status === 'approved');
            const empPendingSales = empSales.filter(s => s.status === 'pending');
            const empRejectedSales = empSales.filter(s => s.status === 'rejected');

            const empRevenue = empApprovedSales.reduce((acc, curr) => acc + parseFloat(curr.total_amount || 0), 0);
            const empTargetPercent = empProfile.monthly_target > 0 ? (empRevenue / empProfile.monthly_target) * 100 : 0;

            return (
              <div>
                {/* Back Button */}
                <div style={{ marginBottom: '24px' }}>
                  <button 
                    className="btn-secondary" 
                    onClick={() => setSelectedEmployeeId(null)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Dashboard</span>
                  </button>
                </div>

                {/* Profile Header */}
                <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                        {empProfile.full_name.charAt(0)}
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-primary)' }}>
                          {empProfile.full_name}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{empProfile.email}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                      <span className={`badge ${empProfile.role}`} style={{ alignSelf: 'center', padding: '6px 12px' }}>
                        {empProfile.role}
                      </span>
                      <button 
                        className="btn-secondary"
                        onClick={() => handleToggleRole(empProfile)}
                      >
                        Set as {empProfile.role === 'admin' ? 'Employee' : 'Admin'}
                      </button>
                      <button 
                        className="btn-secondary"
                        onClick={() => {
                          setEditingTargetId(empProfile.id);
                          setEditingTargetValue(empProfile.monthly_target.toString());
                          setActiveTab('targets');
                          setSelectedEmployeeId(null);
                        }}
                      >
                        Edit Target
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Operator ID</span>
                      <div style={{ fontWeight: '500', marginTop: '4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{empProfile.id}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Registration Date</span>
                      <div style={{ fontWeight: '500', marginTop: '4px', fontSize: '0.9rem' }}>
                        {new Date(empProfile.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Verification Status</span>
                      <div style={{ fontWeight: '500', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {empProfile.is_verified ? (
                          <>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
                            <span style={{ color: 'var(--success)', fontSize: '0.9rem', fontWeight: '600' }}>Verified</span>
                          </>
                        ) : (
                          <>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></span>
                            <span style={{ color: 'var(--warning)', fontSize: '0.9rem', fontWeight: '600' }}>Unverified</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="kpi-grid">
                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon purple">
                      <DollarSign size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">${empRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="kpi-label">Approved Revenue</div>
                    </div>
                  </div>

                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon blue">
                      <FileText size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">{empApprovedSales.length}</div>
                      <div className="kpi-label">Sales Logged</div>
                    </div>
                  </div>

                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon green">
                      <CheckSquare size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">{empPendingSales.length}</div>
                      <div className="kpi-label">Pending Approvals</div>
                    </div>
                  </div>

                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon yellow">
                      <Award size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">{empRejectedSales.length}</div>
                      <div className="kpi-label">Rejected Sales</div>
                    </div>
                  </div>
                </div>

                {/* Quota Progress */}
                {empProfile.role === 'employee' && (
                  <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3 className="chart-title" style={{ marginBottom: '16px' }}>Monthly Target Quota</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      <div style={{ flexGrow: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Monthly Progress</span>
                          <span style={{ fontWeight: '600' }}>
                            ${empRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ${parseFloat(empProfile.monthly_target || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${Math.min(100, empTargetPercent)}%`, 
                              background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-pink))', 
                              borderRadius: '6px'
                            }}
                          ></div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: '100px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: empTargetPercent >= 100 ? 'var(--success)' : 'var(--text-primary)' }}>
                          {Math.round(empTargetPercent)}%
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Reached</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sales Log History Table */}
                <div className="table-card glass-panel">
                  <div className="table-header">
                    <h3 className="chart-title">Sales Activity Logs</h3>
                  </div>
                  
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Logged Date</th>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Total Amount</th>
                          <th>Customer</th>
                          <th>Notes</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empSales.map((sale) => (
                          <tr key={sale.id}>
                            <td>{sale.sale_date}</td>
                            <td style={{ fontWeight: '500' }}>{sale.product_name}</td>
                            <td>{sale.quantity}</td>
                            <td>${parseFloat(sale.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td style={{ fontWeight: '600', color: 'white' }}>
                              ${parseFloat(sale.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td>{sale.customer_name}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sale.notes || '-'}</td>
                            <td>
                              <span className={`badge ${sale.status}`}>
                                {sale.status}
                              </span>
                            </td>
                            <td>
                              {sale.status === 'pending' ? (
                                <div className="btn-action-group">
                                  <button 
                                    className="btn-action approve"
                                    onClick={() => handleApprove(sale.id)}
                                    title="Approve Sale"
                                  >
                                    <Check size={18} />
                                  </button>
                                  <button 
                                    className="btn-action reject"
                                    onClick={() => handleReject(sale.id)}
                                    title="Reject Sale"
                                  >
                                    <X size={18} />
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Reviewed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {empSales.length === 0 && (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                              No sales records found for this representative.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <>
            {/* Dashboard Tabs Content */}
            {activeTab === 'dashboard' && (
              <div>
                <h1 className="dashboard-title">Performance Analytics</h1>
                <p className="dashboard-subtitle">Overview of sales and organizational achievements.</p>

                {/* KPI Metrics */}
                <div className="kpi-grid">
                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon purple">
                      <DollarSign size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="kpi-label">Approved Revenue</div>
                    </div>
                  </div>

                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon blue">
                      <FileText size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">{approvedSales.length}</div>
                      <div className="kpi-label">Sales Logged</div>
                    </div>
                  </div>

                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon green">
                      <CheckSquare size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">{pendingSales.length}</div>
                      <div className="kpi-label">Pending Approvals</div>
                    </div>
                  </div>

                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon yellow">
                      <Award size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">{topPerformer ? `$${topPerformer.totalSalesValue.toLocaleString()}` : '$0.00'}</div>
                      <div className="kpi-label">Top: {topPerformer ? topPerformer.full_name : 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="charts-grid">
                  <div className="chart-card glass-panel">
                    <div className="chart-header">
                      <h3 className="chart-title">Revenue Progress (Last 7 Days)</h3>
                    </div>
                    <div className="chart-container">
                      <Line data={getChartData()} options={chartOptions} />
                    </div>
                  </div>

                  <div className="chart-card glass-panel">
                    <div className="chart-header">
                      <h3 className="chart-title">Product Share</h3>
                    </div>
                    <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {approvedSales.length > 0 ? (
                        <div style={{ height: '220px', width: '220px' }}>
                          <Doughnut 
                            data={getProductData()} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } } } }
                            }} 
                          />
                        </div>
                      ) : (
                        <div className="empty-state">
                          <p className="empty-state-text">No approved sales</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Employee Performance Rankings Table */}
                <div className="table-card glass-panel">
                  <div className="table-header">
                    <h3 className="chart-title">Employee Standings</h3>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Representative</th>
                          <th>Role</th>
                          <th>Sales Count</th>
                          <th>Total Sales Value</th>
                          <th>Monthly Target</th>
                          <th>Quota Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeePerformance.map((emp) => (
                          <tr key={emp.id}>
                            <td>
                              <button 
                                onClick={() => setSelectedEmployeeId(emp.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-primary)',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  padding: 0,
                                  textAlign: 'left',
                                  fontFamily: 'inherit',
                                  fontSize: 'inherit'
                                }}
                                onMouseEnter={(e) => e.target.style.color = 'var(--accent-purple)'}
                                onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}
                              >
                                {emp.full_name}
                              </button>
                            </td>
                            <td><span className="badge employee">Employee</span></td>
                            <td>{emp.totalSalesCount}</td>
                            <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                              ${emp.totalSalesValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td>${parseFloat(emp.monthly_target || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flexGrow: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', width: '100px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${emp.targetProgressPercent}%`, background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-pink))', borderRadius: '3px' }}></div>
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{Math.round(emp.targetProgressPercent)}%</span>
                              </div>
                            </td>
                            <td>
                              <button
                                className="btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'inline-flex', gap: '4px', alignItems: 'center' }}
                                onClick={() => setSelectedEmployeeId(emp.id)}
                              >
                                <Eye size={12} />
                                <span>Details</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {employeePerformance.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No employee profiles found in directory.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Approvals tab */}
            {activeTab === 'approvals' && (
              <div>
                <h1 className="dashboard-title">Sales Approval Queue</h1>
                <p className="dashboard-subtitle">Review, approve, or reject logged sales requests from representatives.</p>

                <div className="table-card glass-panel">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Logged Date</th>
                          <th>Representative</th>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Total Amount</th>
                          <th>Customer</th>
                          <th>Notes</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingSales.map((sale) => (
                          <tr key={sale.id}>
                            <td>{sale.sale_date}</td>
                            <td>{sale.profiles?.full_name || 'Unknown'}</td>
                            <td style={{ fontWeight: '500' }}>{sale.product_name}</td>
                            <td>{sale.quantity}</td>
                            <td>${parseFloat(sale.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td style={{ fontWeight: '600', color: 'white' }}>
                              ${parseFloat(sale.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td>{sale.customer_name}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sale.notes || '-'}</td>
                            <td>
                              <div className="btn-action-group">
                                <button 
                                  className="btn-action approve"
                                  onClick={() => handleApprove(sale.id)}
                                  title="Approve Sale"
                                >
                                  <Check size={18} />
                                </button>
                                <button 
                                  className="btn-action reject"
                                  onClick={() => handleReject(sale.id)}
                                  title="Reject Sale"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pendingSales.length === 0 && (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                              <div className="empty-state">
                                <CheckSquare className="empty-state-icon" style={{ color: 'var(--success)' }} />
                                <p className="empty-state-text">Queue is clear!</p>
                                <p className="empty-state-subtext">No sales entries require approval.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Target manager tab */}
            {activeTab === 'targets' && (
              <div>
                <h1 className="dashboard-title">Sales Target Settings</h1>
                <p className="dashboard-subtitle">Adjust monthly quotas and requirements for individual representatives.</p>

                <div className="table-card glass-panel">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Representative</th>
                          <th>Email</th>
                          <th>Active Target ($)</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profiles.filter(p => p.role === 'employee').map((profile) => (
                          <tr key={profile.id}>
                            <td style={{ fontWeight: '500' }}>{profile.full_name}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{profile.email}</td>
                            <td>
                              {editingTargetId === profile.id ? (
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ padding: '6px 12px', width: '150px' }}
                                  value={editingTargetValue}
                                  onChange={(e) => setEditingTargetValue(e.target.value)}
                                  autoFocus
                                />
                              ) : (
                                <span style={{ fontWeight: '600' }}>
                                  ${parseFloat(profile.monthly_target || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>
                            <td>
                              {editingTargetId === profile.id ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    className="btn-secondary" 
                                    style={{ padding: '6px 12px' }}
                                    onClick={() => handleSaveTarget(profile.id)}
                                  >
                                    Save
                                  </button>
                                  <button 
                                    className="btn-secondary" 
                                    style={{ padding: '6px 12px', background: 'transparent', border: 'none' }}
                                    onClick={() => setEditingTargetId(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  className="btn-secondary"
                                  style={{ padding: '6px 12px', display: 'inline-flex', gap: '6px' }}
                                  onClick={() => {
                                    setEditingTargetId(profile.id);
                                    setEditingTargetValue(profile.monthly_target.toString());
                                  }}
                                >
                                  <Edit2 size={14} />
                                  <span>Edit Target</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {profiles.filter(p => p.role === 'employee').length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No employee accounts found to edit.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Users directory tab */}
            {activeTab === 'users' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start' }}>
                <div>
                  <h1 className="dashboard-title">System Directory</h1>
                  <p className="dashboard-subtitle">All active platform operators, including administrative roles.</p>

                  <div className="table-card glass-panel">
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>System Role</th>
                            <th>Registered At</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profiles.map((profile) => (
                            <tr key={profile.id}>
                              <td style={{ fontWeight: '500' }}>{profile.full_name}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{profile.email}</td>
                              <td>
                                <span className={`badge ${profile.role}`}>
                                  {profile.role}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {new Date(profile.created_at).toLocaleDateString()}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {profile.role === 'employee' && (
                                    <button
                                      className="btn-secondary"
                                      style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'inline-flex', gap: '4px', alignItems: 'center' }}
                                      onClick={() => setSelectedEmployeeId(profile.id)}
                                    >
                                      <Eye size={12} />
                                      <span>View Info</span>
                                    </button>
                                  )}
                                  {profile.id !== user.id ? (
                                    <button
                                      className="btn-secondary"
                                      style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                                      onClick={() => handleToggleRole(profile)}
                                    >
                                      Set as {profile.role === 'admin' ? 'Employee' : 'Admin'}
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Active Admin</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Create User Form card */}
                <div>
                  <h2 className="dashboard-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Register New User</h2>
                  <p className="dashboard-subtitle" style={{ marginBottom: '24px' }}>Add a new operator with designated credentials.</p>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <form onSubmit={handleRegisterUser}>
                      <div className="form-group">
                        <label htmlFor="newUserFullName">Full Name</label>
                        <input
                          id="newUserFullName"
                          type="text"
                          className="form-input"
                          placeholder="Alice Smith"
                          value={newUserFullName}
                          onChange={(e) => setNewUserFullName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="newUserEmail">Email Address</label>
                        <input
                          id="newUserEmail"
                          type="email"
                          className="form-input"
                          placeholder="alice@company.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="newUserPassword">Temporary Password</label>
                        <input
                          id="newUserPassword"
                          type="password"
                          className="form-input"
                          placeholder="Minimum 6 characters"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Assigned Role</label>
                        <div className="select-role-container">
                          <div>
                            <input
                              type="radio"
                              id="new-role-employee"
                              name="new-role"
                              value="employee"
                              className="role-radio"
                              checked={newUserRole === 'employee'}
                              onChange={() => setNewUserRole('employee')}
                            />
                            <label htmlFor="new-role-employee" className="role-label">
                              Employee
                            </label>
                          </div>
                          <div>
                            <input
                              type="radio"
                              id="new-role-admin"
                              name="new-role"
                              value="admin"
                              className="role-radio"
                              checked={newUserRole === 'admin'}
                              onChange={() => setNewUserRole('admin')}
                            />
                            <label htmlFor="new-role-admin" className="role-label">
                              Admin
                            </label>
                          </div>
                        </div>
                      </div>

                      {newUserRole === 'employee' && (
                        <div className="form-group">
                          <label htmlFor="newUserTarget">Monthly Target ($)</label>
                          <input
                            id="newUserTarget"
                            type="number"
                            min="0"
                            className="form-input"
                            placeholder="5000"
                            value={newUserTarget}
                            onChange={(e) => setNewUserTarget(e.target.value)}
                          />
                        </div>
                      )}

                      <button type="submit" className="btn-primary" style={{ marginTop: '10px' }} disabled={submittingUser}>
                        {submittingUser ? (
                          <span className="loader"></span>
                        ) : (
                          <>
                            <PlusCircle size={18} />
                            <span>Add Operator</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
