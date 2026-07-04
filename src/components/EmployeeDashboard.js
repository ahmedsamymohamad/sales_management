import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp, DollarSign, Award, LogOut, PlusCircle,
  FileText, Menu, Clock, CheckCircle, XCircle, Trash2
} from 'lucide-react';

export default function EmployeeDashboard({ user, onLogout, showToast }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarActive, setSidebarActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Database States
  const [sales, setSales] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [profile, setProfile] = useState(null);
  const [brands, setBrands] = useState([]);
  const [subProducts, setSubProducts] = useState([]);
  const [locations, setLocations] = useState([]);

  // Form States
  const [productName, setProductName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedSubProduct, setSelectedSubProduct] = useState('');
  const [customSubProduct, setCustomSubProduct] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    try {
      // 1. Fetch Current User's Profile
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profErr) throw profErr;
      setProfile(profData);

      // 2. Fetch Profiles for Leaderboard
      const { data: allProfiles, error: allProfErr } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (allProfErr) throw allProfErr;
      setProfiles(allProfiles || []);

      // 3. Fetch My Sales Logs
      const { data: mySales, error: mySalesErr } = await supabase
        .from('sales')
        .select('*')
        .eq('employee_id', user.id)
        .order('sale_date', { ascending: false });
      if (mySalesErr) throw mySalesErr;
      setSales(mySales || []);

      // 4. Fetch Brands
      const { data: brandData, error: brandErr } = await supabase
        .from('brands')
        .select('*')
        .order('name', { ascending: true });
      if (brandErr && brandErr.code !== 'PGRST116' && !brandErr.message.includes('relation "public.brands" does not exist')) {
        throw brandErr;
      }
      setBrands(brandData || []);

      // 4b. Fetch Sub-Products
      const { data: subProductData, error: subProductErr } = await supabase
        .from('sub_products')
        .select('*')
        .order('name', { ascending: true });
      if (subProductErr && subProductErr.code !== 'PGRST116' && !subProductErr.message.includes('relation "public.sub_products" does not exist')) {
        throw subProductErr;
      }
      setSubProducts(subProductData || []);

      // 4c. Fetch Locations
      const { data: locationData, error: locationErr } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });
      if (locationErr && locationErr.code !== 'PGRST116' && !locationErr.message.includes('relation "public.locations" does not exist')) {
        throw locationErr;
      }
      setLocations(locationData || []);

      // 5. Fetch All Approved Sales for Leaderboard calculation
      // (Even though employees can't edit other sales, their RLS policy allows reading approved or their own sales)
      const { data: approvedSales, error: appSalesErr } = await supabase
        .from('sales')
        .select('*')
        .eq('status', 'approved');
      if (appSalesErr) throw appSalesErr;

      // Update local cache of sales including other users' approved sales if available
      // Actually, we'll store this approved list inside our leaderboard calculation.
      return approvedSales || [];
    } catch (err) {
      console.error('Error fetching employee dashboard data:', err);
      showToast('Error syncing with database.', 'danger');
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const appSales = await fetchData();
      setLoading(false);
    };
    init();

    // Set up Real-Time DB Subscriptions for Sales, Brands, Sub-products, and Locations updates (e.g. when admin approves)
    const salesChannel = supabase
      .channel('employee-sales-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brands' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_products' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, []);

  // Handle Log Sale Submit
  const handleLogSale = async (e) => {
    e.preventDefault();
    if (submittingSale) return;

    // 1. Determine Brand
    let brandVal = '';
    if (selectedBrand === 'Other') {
      brandVal = productName.trim();
    } else {
      brandVal = selectedBrand;
    }

    if (!brandVal) {
      showToast('Please select or specify a brand.', 'warning');
      return;
    }

    // 2. Determine Sub-Product (Optional)
    let subProductVal = null;
    if (selectedSubProduct === 'Other') {
      if (customSubProduct.trim()) {
        subProductVal = customSubProduct.trim();
      }
    } else if (selectedSubProduct && selectedSubProduct !== '') {
      subProductVal = selectedSubProduct;
    }

    // 3. Determine Location
    let locationVal = '';
    if (selectedLocation === 'Other') {
      locationVal = customLocation.trim();
    } else {
      locationVal = selectedLocation;
    }

    if (!locationVal) {
      showToast('Please select or specify a location.', 'warning');
      return;
    }

    // 4. Determine combined product_name
    const finalProductName = subProductVal
      ? `${brandVal} - ${subProductVal}`
      : brandVal;

    const qty = parseInt(quantity);
    const total = parseFloat(unitPrice);
    const customer = customerName.trim();

    if (isNaN(qty) || isNaN(total) || qty <= 0 || total < 0) {
      showToast('Please check form fields for accuracy.', 'warning');
      return;
    }

    setSubmittingSale(true);
    const unitPriceVal = total / qty;

    try {
      const { error } = await supabase
        .from('sales')
        .insert([
          {
            employee_id: user.id,
            product_name: finalProductName,
            brand_name: brandVal,
            sub_product_name: subProductVal,
            location: locationVal,
            quantity: qty,
            unit_price: unitPriceVal,
            total_amount: total,
            sale_date: saleDate,
            customer_name: customer || null,
            notes: notes,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      showToast('Sale logged successfully! Awaiting Admin approval.', 'success');

      // Reset form
      setProductName('');
      setSelectedBrand('');
      setSelectedSubProduct('');
      setCustomSubProduct('');
      setSelectedLocation('');
      setCustomLocation('');
      setQuantity('1');
      setUnitPrice('');
      setCustomerName('');
      setNotes('');
      setSaleDate(new Date().toISOString().split('T')[0]);

      fetchData();
    } catch (err) {
      showToast(err.message || 'Error logging sale.', 'danger');
    } finally {
      setSubmittingSale(false);
    }
  };

  // Delete pending sale (allow employee to recall a mistake)
  const handleDeleteSale = async (saleId) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId)
        .eq('status', 'pending'); // safety check

      if (error) throw error;
      showToast('Pending sale deleted.', 'warning');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Error deleting sale.', 'danger');
    }
  };

  // --- CALCULATE PERSONAL STATS ---
  const myApprovedSales = sales.filter(s => s.status === 'approved');
  const myPendingSales = sales.filter(s => s.status === 'pending');

  const totalMyRevenue = myApprovedSales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
  const totalMySalesCount = myApprovedSales.length;

  const targetValue = profile?.monthly_target || 5000;
  const targetProgressPercent = targetValue > 0 ? (totalMyRevenue / targetValue) * 100 : 0;
  const roundedPercent = Math.round(Math.min(100, targetProgressPercent));
  const remainingTarget = Math.max(0, targetValue - totalMyRevenue);

  // SVG circular properties
  const radius = 72;
  const circumference = 2 * Math.PI * radius; // ~452.389
  const strokeDashoffset = circumference - (roundedPercent / 100) * circumference;

  // --- LEADERBOARD CALCULATION ---
  // To create a leaderboard, we need to gather all employee profiles
  // and accumulate their total approved sales value.
  // Note: Employees can read other users' profiles, and can query approved sales.
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const calculateLeaderboard = async () => {
      try {
        // Query approved sales from Supabase
        const { data: approvedSales, error } = await supabase
          .from('sales')
          .select('employee_id, total_amount')
          .eq('status', 'approved');

        if (error) throw error;

        const salesMap = {};
        approvedSales?.forEach(s => {
          salesMap[s.employee_id] = (salesMap[s.employee_id] || 0) + parseFloat(s.total_amount || 0);
        });

        const ranks = profiles
          .filter(p => p.role === 'employee')
          .map(p => ({
            id: p.id,
            name: p.full_name,
            totalRevenue: salesMap[p.id] || 0
          }))
          .sort((a, b) => b.totalRevenue - a.totalRevenue);

        setLeaderboard(ranks);
      } catch (err) {
        console.error('Error calculating leaderboard:', err);
      }
    };

    if (profiles.length > 0) {
      calculateLeaderboard();
    }
  }, [profiles, sales]);

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
            <button onClick={() => { setActiveTab('dashboard'); setSidebarActive(false); }}>
              <TrendingUp size={18} />
              <span>My Dashboard</span>
            </button>
          </li>
          <li className={`menu-item ${activeTab === 'history' ? 'active' : ''}`}>
            <button onClick={() => { setActiveTab('history'); setSidebarActive(false); }}>
              <FileText size={18} />
              <span>Sales History ({sales.length})</span>
            </button>
          </li>
          <li className={`menu-item ${activeTab === 'leaderboard' ? 'active' : ''}`}>
            <button onClick={() => { setActiveTab('leaderboard'); setSidebarActive(false); }}>
              <Award size={18} />
              <span>Leaderboard</span>
            </button>
          </li>
        </ul>

        <div className="sidebar-user">
          <div className="user-avatar">{user.email.charAt(0)}</div>
          <div className="user-info">
            <div className="user-name">{profile?.full_name || 'Sales Rep'}</div>
            <div className="user-role">Sales Representative</div>
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
        ) : (
          <>
            {/* My Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div>
                <h1 className="dashboard-title">Welcome back, {profile?.full_name || 'Representative'}</h1>
                <p className="dashboard-subtitle">Track your target progress and log new closed sales.</p>

                {/* KPI Metrics */}
                <div className="kpi-grid">
                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon purple">
                      <DollarSign size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">${totalMyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="kpi-label">Approved Revenue</div>
                    </div>
                  </div>

                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon blue">
                      <FileText size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">{totalMySalesCount}</div>
                      <div className="kpi-label">Approved Sales</div>
                    </div>
                  </div>

                  <div className="kpi-card glass-panel">
                    <div className="kpi-icon yellow">
                      <Clock size={24} />
                    </div>
                    <div className="kpi-details">
                      <div className="kpi-value">{myPendingSales.length}</div>
                      <div className="kpi-label">Pending Approval</div>
                    </div>
                  </div>
                </div>

                {/* Dashboard Grid (Progress & Form) */}
                <div className="charts-grid" style={{ gridTemplateColumns: '1.2fr 2fr' }}>
                  {/* Gauge Progress */}
                  <div className="chart-card glass-panel" style={{ minHeight: '410px' }}>
                    <div className="chart-header">
                      <h3 className="chart-title">Quota Targets Progress</h3>
                    </div>
                    <div className="target-gauge-box">
                      <div className="gauge-circle">
                        <svg className="gauge-svg">
                          <defs>
                            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="var(--accent-purple)" />
                              <stop offset="100%" stopColor="var(--accent-pink)" />
                            </linearGradient>
                          </defs>
                          <circle className="gauge-track" cx="80" cy="80" r={radius} />
                          <circle
                            className="gauge-fill"
                            cx="80"
                            cy="80"
                            r={radius}
                            style={{ strokeDashoffset }}
                          />
                        </svg>
                        <div className="gauge-content">
                          <div className="gauge-percentage">{roundedPercent}%</div>
                          <div className="gauge-label">Completed</div>
                        </div>
                      </div>

                      <div className="target-numbers">
                        <div className="target-current">
                          ${totalMyRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </div>
                        <div className="target-limit">
                          Goal: ${targetValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </div>
                        {remainingTarget > 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Need ${remainingTarget.toLocaleString()} more this month
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '600', marginTop: '8px' }}>
                            Target Met! Awesome Job! 🎉
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Log Sale Form */}
                  <div className="chart-card glass-panel" style={{ minHeight: '410px' }}>
                    <div className="chart-header">
                      <h3 className="chart-title">Log a Closed Sale</h3>
                    </div>

                    <form onSubmit={handleLogSale} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label htmlFor="selectedBrand">Choose Product Brand</label>
                        <select
                          id="selectedBrand"
                          className="form-input"
                          style={{
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            cursor: 'pointer'
                          }}
                          value={selectedBrand}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedBrand(val);
                            setSelectedSubProduct('');
                            setCustomSubProduct('');
                            if (val !== 'Other') {
                              setProductName(val);
                            } else {
                              setProductName('');
                            }
                          }}
                          required
                        >
                          <option value="" disabled>-- Select a Brand --</option>
                          {brands.map(b => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                          <option value="Other">Other (Specify Custom...)</option>
                        </select>
                      </div>

                      {selectedBrand === 'Other' && (
                        <div className="form-group" style={{ gridColumn: 'span 2', animation: 'fadeIn 0.2s ease-out' }}>
                          <label htmlFor="productName">Specify Custom Brand Name</label>
                          <input
                            id="productName"
                            type="text"
                            className="form-input"
                            placeholder="e.g. AuraCloud SaaS"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            required
                          />
                        </div>
                      )}

                      {/* Optional Sub-Product selection */}
                      {selectedBrand && selectedBrand !== 'Other' && (() => {
                        const selectedBrandObj = brands.find(b => b.name === selectedBrand);
                        const filteredSubProducts = selectedBrandObj
                          ? subProducts.filter(sp => sp.brand_id === selectedBrandObj.id)
                          : [];
                        return (
                          <div className="form-group" style={{ gridColumn: 'span 2', animation: 'fadeIn 0.2s ease-out' }}>
                            <label htmlFor="selectedSubProduct">Choose Sub-Product (Optional)</label>
                            <select
                              id="selectedSubProduct"
                              className="form-input"
                              style={{
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                cursor: 'pointer'
                              }}
                              value={selectedSubProduct}
                              onChange={(e) => {
                                setSelectedSubProduct(e.target.value);
                                if (e.target.value !== 'Other') {
                                  setCustomSubProduct('');
                                }
                              }}
                            >
                              <option value="">-- None (Only Brand) --</option>
                              {filteredSubProducts.map(sp => (
                                <option key={sp.id} value={sp.name}>{sp.name}</option>
                              ))}
                              <option value="Other">Other (Specify Custom...)</option>
                            </select>
                          </div>
                        );
                      })()}

                      {/* Custom Sub-Product */}
                      {(selectedBrand === 'Other' || selectedSubProduct === 'Other') && (
                        <div className="form-group" style={{ gridColumn: 'span 2', animation: 'fadeIn 0.2s ease-out' }}>
                          <label htmlFor="customSubProduct">Specify Sub-Product Name (Optional)</label>
                          <input
                            id="customSubProduct"
                            type="text"
                            className="form-input"
                            placeholder="e.g. Starter Pack Plan"
                            value={customSubProduct}
                            onChange={(e) => setCustomSubProduct(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Location Selection */}
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label htmlFor="selectedLocation">Choose Sale Location</label>
                        <select
                          id="selectedLocation"
                          className="form-input"
                          style={{
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            cursor: 'pointer'
                          }}
                          value={selectedLocation}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedLocation(val);
                            if (val !== 'Other') {
                              setCustomLocation('');
                            }
                          }}
                          required
                        >
                          <option value="" disabled>-- Select Location --</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.name}>{loc.name}</option>
                          ))}
                          <option value="Other">Other (Specify Custom...)</option>
                        </select>
                      </div>

                      {selectedLocation === 'Other' && (
                        <div className="form-group" style={{ gridColumn: 'span 2', animation: 'fadeIn 0.2s ease-out' }}>
                          <label htmlFor="customLocation">Specify Custom Location</label>
                          <input
                            id="customLocation"
                            type="text"
                            className="form-input"
                            placeholder="e.g. Munich Retail Center"
                            value={customLocation}
                            onChange={(e) => setCustomLocation(e.target.value)}
                            required
                          />
                        </div>
                      )}

                      <div className="form-group">
                        <label htmlFor="quantity">Quantity</label>
                        <input
                          id="quantity"
                          type="number"
                          min="1"
                          className="form-input"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="unitPrice">Total Price ($)</label>
                        <input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input"
                          placeholder="0.00"
                          value={unitPrice}
                          onChange={(e) => setUnitPrice(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="customerName">Customer/Company Name (Optional)</label>
                        <input
                          id="customerName"
                          type="text"
                          className="form-input"
                          placeholder="Acme Corp (Optional)"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="saleDate">Date of Sale</label>
                        <input
                          id="saleDate"
                          type="date"
                          className="form-input"
                          value={saleDate}
                          onChange={(e) => setSaleDate(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label htmlFor="notes">Additional Comments</label>
                        <input
                          id="notes"
                          type="text"
                          className="form-input"
                          placeholder="Notes or transaction deal info..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>

                      <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Sale Value: </span>
                          <span style={{ fontWeight: '700', fontSize: '1.25rem', color: 'var(--success)' }}>
                            ${(parseFloat(unitPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} disabled={submittingSale}>
                          {submittingSale ? (
                            <span className="loader"></span>
                          ) : (
                            <>
                              <PlusCircle size={16} />
                              <span>Submit Sale</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Sales History Tab */}
            {activeTab === 'history' && (
              <div>
                <h1 className="dashboard-title">Logged Sales History</h1>
                <p className="dashboard-subtitle">Complete log of all sales requests submitted by you.</p>

                <div className="table-card glass-panel">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Sale Date</th>
                          <th>Product/Service</th>
                          <th>Qty</th>
                          {/*<th>Price ($)</th>*/}
                          <th>Total Amount</th>
                          <th>Customer</th>
                          <th>Location</th>
                          <th>Notes</th>
                          <th>Approval Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((sale) => (
                          <tr key={sale.id}>
                            <td>{sale.sale_date}</td>
                            <td style={{ fontWeight: '500' }}>{sale.product_name}</td>
                            <td>{sale.quantity}</td>
                            {/*<td>${parseFloat(sale.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td> */}
                            <td style={{ fontWeight: '600' }}>
                              ${parseFloat(sale.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td>{sale.customer_name}</td>
                            <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                              {sale.location || '-'}
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sale.notes || '-'}</td>
                            <td>
                              <span className={`badge ${sale.status}`}>
                                {sale.status}
                              </span>
                            </td>
                            <td>
                              {sale.status === 'pending' ? (
                                <button
                                  className="btn-logout"
                                  style={{ padding: '6px' }}
                                  onClick={() => handleDeleteSale(sale.id)}
                                  title="Delete Pending Log"
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Locked</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {sales.length === 0 && (
                          <tr>
                            <td colSpan="10" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                              <div className="empty-state">
                                <FileText className="empty-state-icon" />
                                <p className="empty-state-text">No Sales History</p>
                                <p className="empty-state-subtext">You haven't logged any sales records yet.</p>
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

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
              <div>
                <h1 className="dashboard-title">Representative Rankings</h1>
                <p className="dashboard-subtitle">Track comparative organizational leadership stands based on approved revenue volume.</p>

                <div className="table-card glass-panel" style={{ maxWidth: '640px', margin: '0 auto' }}>
                  <div className="leaderboard-list">
                    {leaderboard.map((item, idx) => {
                      const isMe = item.id === user.id;
                      return (
                        <div
                          key={item.id}
                          className="leaderboard-item"
                          style={isMe ? { borderColor: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.05)' } : {}}
                        >
                          <span className={`leaderboard-rank rank-${idx + 1}`}>
                            {idx + 1}
                          </span>
                          <div className="leaderboard-avatar">
                            {item.name.charAt(0)}
                          </div>
                          <div className="leaderboard-details">
                            <span className="leaderboard-name" style={isMe ? { fontWeight: '600', color: 'white' } : {}}>
                              {item.name} {isMe && '(You)'}
                            </span>
                            <div className="leaderboard-sales-count">Active Representative</div>
                          </div>
                          <div className="leaderboard-revenue">
                            ${parseFloat(item.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })}
                    {leaderboard.length === 0 && (
                      <div className="empty-state">
                        <Award className="empty-state-icon" />
                        <p className="empty-state-text">Leaderboard is empty</p>
                        <p className="empty-state-subtext">No approved sales revenue logged yet.</p>
                      </div>
                    )}
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
