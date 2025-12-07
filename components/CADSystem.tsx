import React, { useState, useEffect } from 'react';
import { AlertCircle, Radio, MapPin, Clock, User, Phone, FileText, Plus, X, Check, Shield, AlertTriangle, Lock, Download, Upload } from 'lucide-react';

const CALL_CODES = ['CALL FOR SERVICE', 'ASSAULT', 'BURGLARY', 'TRAFFIC STOP', 'DOMESTIC DISTURBANCE', 'THEFT', 'SUSPICIOUS ACTIVITY', 'WELFARE CHECK', 'NOISE COMPLAINT', 'TRESPASSING'];

const DEPARTMENTS = [
  'SO-ADMIN', 'SO-CMND', 'SO-AREA 3 SUPRV', 'SO-AREA 4 SUPRV', 'SO-AREA 3|4 SUPRV', 'SO-AREA 5 SUPRV',
  'SO-SUPRV', 'SO-AREA 3A', 'SO-AREA 4A', 'SO-AREA 5A', 'SO-SWAT', 'SO-TRFC', 'SO-MARINE', 'SO-DET',
  'SO-K9', 'SO-AIR', 'CSO-AREA 3|4', 'CSO-METRO', 'CSO-ASSISTANCE', 'MT-METRO 3', 'MT-METRO 4',
  'MT-METRO 3|4', 'MT-METRO 5', 'MT-METRO 5|6', 'MT-SUPRV', 'PL-PALETO', 'SO-AREA 3P', 'SO-AREA 3Z',
  'SO-AREA 4G', 'SO-AREA 4F', 'SO-AREA 4H', 'MT-DET', 'MT-K9', 'PL-K9', 'MT-AIR', 'SO-PROBATION',
  'CSO-TOW', 'SO-COMMS', 'SO-WC', 'SO-ROAM', 'SO-HEAT'
];

const CADSystem = () => {
  // Helper function to format time in PST
  const formatPSTTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      timeZone: 'America/Los_Angeles',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to format date and time in PST
  const formatPSTDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const dateStr = date.toLocaleDateString('en-US', { 
      timeZone: 'America/Los_Angeles',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      timeZone: 'America/Los_Angeles',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${dateStr} ${timeStr}`;
  };

  // Helper function to format date only in PST
  const formatPSTDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      timeZone: 'America/Los_Angeles',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const [selectedRole, setSelectedRole] = useState(null);
  const [activeTab, setActiveTab] = useState('dispatch');
  const [userRole, setUserRole] = useState('dispatcher');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calls, setCalls] = useState([]);
  const [units, setUnits] = useState([]);
  const [showNewCall, setShowNewCall] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [callIdCounter, setCallIdCounter] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showUnitInfo, setShowUnitInfo] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [loggedInOfficer, setLoggedInOfficer] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  
  // Permission settings - can be controlled by admin
  const [permissions, setPermissions] = useState({
    canAccessDispatch: true,
    canAccessPolice: true
  });

  // Officer login credentials - each officer has their own login
  // In production, this would be stored in a database with hashed passwords
  const [officerCredentials, setOfficerCredentials] = useState([
    { 
      username: 'johnson', 
      password: 'deputy123', 
      unitId: 'Unit-1',
      displayName: 'Deputy Johnson'
    },
    { 
      username: 'smith', 
      password: 'deputy123', 
      unitId: 'Unit-2',
      displayName: 'Deputy Smith'
    },
    { 
      username: 'davis', 
      password: 'deputy123', 
      unitId: 'Unit-3',
      displayName: 'Deputy Davis'
    }
  ]);
  
  // Initialize data on mount
  useEffect(() => {
    if (selectedRole && units.length === 0) {
      const initialUnits = [
        { 
          id: 'Unit-1', 
          callsign: 'A-101', 
          status: 'available', 
          officer: 'Officer Johnson', 
          assignedCall: null,
          aop: 'Area 3',
          agency: 'LSSO',
          rank: 'Deputy',
          department: 'SO-AREA 3A',
          location: 'Postal 1234'
        },
        { 
          id: 'Unit-2', 
          callsign: 'A-102', 
          status: 'available', 
          officer: 'Officer Smith', 
          assignedCall: null,
          aop: 'Area 4',
          agency: 'LSSO',
          rank: 'Deputy',
          department: 'SO-AREA 4A',
          location: 'Postal 5678'
        },
        { 
          id: 'Unit-3', 
          callsign: 'A-103', 
          status: 'available', 
          officer: 'Officer Davis', 
          assignedCall: null,
          aop: 'Area 5',
          agency: 'LSSO',
          rank: 'Deputy',
          department: 'SO-AREA 5A',
          location: 'Postal 9012'
        }
      ];
      setUnits(initialUnits);
    }
  }, [selectedRole]);

  useEffect(() => {
    if (selectedRole) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      
      if (selectedRole === 'police') {
        setActiveTab('unit-view');
      } else if (selectedRole === 'dispatch') {
        setActiveTab('dispatch');
      }
      
      return () => clearInterval(timer);
    }
  }, [selectedRole]);

  const createCall = (callData) => {
    const callId = String(callIdCounter).padStart(6, '0');
    const availableUnit = units.find(u => u.status === 'available' && !u.assignedCall);
    
    const newCall = {
      id: callId,
      ...callData,
      status: availableUnit ? 'ACTIVE' : 'PENDING',
      assignedUnits: availableUnit ? [availableUnit.id] : [],
      primaryUnit: availableUnit?.id || null,
      timestamp: new Date().toISOString(),
      callNotes: []
    };
    
    setCalls([...calls, newCall]);
    
    if (availableUnit) {
      setUnits(units.map(u => u.id === availableUnit.id ? { ...u, assignedCall: callId, status: 'enroute' } : u));
    }
    
    setCallIdCounter(callIdCounter + 1);
    setShowNewCall(false);
  };

  const assignUnit = (callId, unitId) => {
    setCalls(calls.map(call => {
      if (call.id === callId) {
        const assigned = call.assignedUnits.includes(unitId) 
          ? call.assignedUnits.filter(id => id !== unitId)
          : [...call.assignedUnits, unitId];
        return { 
          ...call, 
          assignedUnits: assigned, 
          status: assigned.length > 0 ? 'ACTIVE' : 'PENDING',
          primaryUnit: call.primaryUnit || assigned[0] || null
        };
      }
      return call;
    }));
    
    setUnits(units.map(unit => {
      if (unit.id === unitId) {
        const call = calls.find(c => c.id === callId);
        const willBeAssigned = call && !call.assignedUnits.includes(unitId);
        return { 
          ...unit, 
          assignedCall: willBeAssigned ? callId : null, 
          status: willBeAssigned ? 'enroute' : 'available' 
        };
      }
      return unit;
    }));
  };

  const updateUnitStatus = (unitId, newStatus) => {
    setUnits(units.map(u => u.id === unitId ? { ...u, status: newStatus } : u));
  };

  const updateUnitInfo = (unitId, updatedInfo) => {
    setUnits(units.map(u => u.id === unitId ? { ...u, ...updatedInfo } : u));
  };

  const closeCall = (callId) => {
    setCalls(calls.map(c => c.id === callId ? { ...c, status: 'CLOSED' } : c));
    setUnits(units.map(u => u.assignedCall === callId ? { ...u, assignedCall: null, status: 'available' } : u));
  };

  const addNote = (callId, note) => {
    setCalls(calls.map(c => c.id === callId ? { 
      ...c, 
      callNotes: [...(c.callNotes || []), { text: note, timestamp: new Date().toISOString() }] 
    } : c));
  };

  const setPrimary = (callId, unitId) => {
    setCalls(calls.map(c => c.id === callId ? { ...c, primaryUnit: unitId } : c));
  };

  const exportData = () => {
    const data = {
      calls,
      units,
      callIdCounter,
      officerCredentials,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cad-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.calls) setCalls(data.calls);
          if (data.units) setUnits(data.units);
          if (data.callIdCounter) setCallIdCounter(data.callIdCounter);
          if (data.officerCredentials) setOfficerCredentials(data.officerCredentials);
          setShowExportImport(false);
          alert('Data imported successfully!');
        } catch (error) {
          alert('Error importing data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'available': 'bg-green-500',
      'busy': 'bg-yellow-500',
      'unavailable': 'bg-red-500',
      'enroute': 'bg-blue-500',
      'onscene': 'bg-purple-500',
      'panic': 'bg-red-600 animate-pulse'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case '1': return 'bg-red-600';
      case '2': return 'bg-yellow-600';
      case '3': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'available': 'Available 10-8',
      'busy': 'Busy 10-6',
      'unavailable': 'Unavailable 10-7',
      'enroute': 'Enroute 10-76',
      'onscene': 'On-Scene 10-23',
      'panic': 'PANIC'
    };
    return labels[status] || status;
  };

  const RoleSelection = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-6xl">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-yellow-400 mb-2">Silver Lining Roleplay</h1>
            <p className="text-3xl text-white">Los Santos Sheriff Office</p>
            <p className="text-gray-300 mt-4">Select Your Role</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="relative">
              <button
                onClick={() => permissions.canAccessDispatch && setSelectedRole('dispatch')}
                disabled={!permissions.canAccessDispatch}
                className={`w-full bg-gray-800 rounded-lg p-8 border-4 transition transform hover:scale-105 ${
                  permissions.canAccessDispatch 
                    ? 'border-blue-500 hover:border-blue-400 cursor-pointer' 
                    : 'border-gray-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <Radio size={64} className={`mx-auto mb-4 ${permissions.canAccessDispatch ? 'text-blue-500' : 'text-gray-500'}`} />
                <h3 className="text-2xl font-bold text-white mb-2">Dispatch</h3>
                <p className="text-gray-400 mb-4">Manage emergency calls and coordinate units</p>
                {!permissions.canAccessDispatch && (
                  <div className="flex items-center justify-center gap-2 text-yellow-500">
                    <Lock size={16} />
                    <span className="text-sm">Admin Permission Required</span>
                  </div>
                )}
              </button>
            </div>

            <div>
              <button
                onClick={() => setSelectedRole('civilian')}
                className="w-full bg-gray-800 rounded-lg p-8 border-4 border-green-500 hover:border-green-400 transition transform hover:scale-105 cursor-pointer"
              >
                <User size={64} className="text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Civilian</h3>
                <p className="text-gray-400 mb-4">Report incidents and view public information</p>
                <div className="text-green-500 text-sm font-semibold">Open to All</div>
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  if (permissions.canAccessPolice) {
                    setSelectedRole('police');
                    setShowLogin(true);
                  }
                }}
                disabled={!permissions.canAccessPolice}
                className={`w-full bg-gray-800 rounded-lg p-8 border-4 transition transform hover:scale-105 ${
                  permissions.canAccessPolice 
                    ? 'border-yellow-500 hover:border-yellow-400 cursor-pointer' 
                    : 'border-gray-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <Shield size={64} className={`mx-auto mb-4 ${permissions.canAccessPolice ? 'text-yellow-500' : 'text-gray-500'}`} />
                <h3 className="text-2xl font-bold text-white mb-2">Police</h3>
                <p className="text-gray-400 mb-4">Access MDT and manage your unit</p>
                {!permissions.canAccessPolice && (
                  <div className="flex items-center justify-center gap-2 text-yellow-500">
                    <Lock size={16} />
                    <span className="text-sm">Admin Permission Required</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="mt-8 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm mb-3">
              <strong className="text-white">Note:</strong> Data is stored in memory during this session. Use Export/Import to save your progress.
            </p>
            <div className="flex gap-4 justify-center text-xs">
              <span className={permissions.canAccessDispatch ? 'text-green-400' : 'text-red-400'}>
                Dispatch: {permissions.canAccessDispatch ? 'Enabled' : 'Disabled'}
              </span>
              <span className={permissions.canAccessPolice ? 'text-green-400' : 'text-red-400'}>
                Police: {permissions.canAccessPolice ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PoliceLogin = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = () => {
      const officer = officerCredentials.find(
        cred => cred.username.toLowerCase() === credentials.username.toLowerCase() && 
                cred.password === credentials.password
      );

      if (officer) {
        setLoggedInOfficer(officer);
        setSelectedUnit(officer.unitId);
        setShowLogin(false);
        setError('');
      } else {
        setError('Invalid username or password');
      }
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border-4 border-yellow-500">
          <div className="text-center mb-6">
            <Shield size={64} className="text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Officer Login</h2>
            <p className="text-gray-400">Los Santos Sheriff Office</p>
          </div>

          {error && (
            <div className="bg-red-900 border border-red-500 rounded p-3 mb-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                onKeyPress={handleKeyPress}
                className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Enter your username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  onKeyPress={handleKeyPress}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Enter your password"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <Lock size={20} /> : <Lock size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-500 transition text-lg"
            >
              Sign In
            </button>

            <button
              onClick={() => {
                setSelectedRole(null);
                setShowLogin(false);
                setError('');
              }}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-500 transition"
            >
              Back to Role Selection
            </button>
          </div>

          <div className="mt-6 bg-gray-700 rounded p-4">
            <p className="text-gray-300 text-xs mb-2">
              <strong className="text-white">Demo Credentials:</strong>
            </p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>• Username: <span className="text-yellow-400">johnson</span> / Password: <span className="text-yellow-400">deputy123</span></p>
              <p>• Username: <span className="text-yellow-400">smith</span> / Password: <span className="text-yellow-400">deputy123</span></p>
              <p>• Username: <span className="text-yellow-400">davis</span> / Password: <span className="text-yellow-400">deputy123</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CivilianInterface = () => {
    const [reportData, setReportData] = useState({
      type: 'CALL FOR SERVICE',
      location: '',
      description: '',
      name: '',
      phone: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
      createCall({
        callOrigin: 'CALLER',
        priority: '2',
        address: reportData.location,
        postal: '',
        callTitle: 'LE',
        code: reportData.type,
        description: reportData.description,
        caller: reportData.name,
        phone: reportData.phone
      });
      setSubmitted(true);
      setTimeout(() => {
        setReportData({ type: 'CALL FOR SERVICE', location: '', description: '', name: '', phone: '' });
        setSubmitted(false);
      }, 3000);
    };

    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-gradient-to-r from-green-900 to-green-800 border-b-4 border-green-500 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-green-400">Civilian Portal</h1>
                <p className="text-xl text-white">Silver Lining Roleplay - LSSO</p>
              </div>
              <button
                onClick={() => setSelectedRole(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Exit
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Report an Incident</h2>
              <p className="text-gray-400 mb-6">Use this form to report emergencies or non-emergency incidents to law enforcement.</p>

              {submitted ? (
                <div className="bg-green-900 border border-green-500 rounded p-6 text-center">
                  <Check size={48} className="text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Report Submitted Successfully</h3>
                  <p className="text-gray-300">Your incident has been reported. Emergency services have been notified.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Incident Type</label>
                    <select value={reportData.type} onChange={(e) => setReportData({...reportData, type: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2">
                      {CALL_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Location</label>
                    <input
                      type="text"
                      value={reportData.location}
                      onChange={(e) => setReportData({...reportData, location: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      placeholder="Enter address or location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Description</label>
                    <textarea
                      value={reportData.description}
                      onChange={(e) => setReportData({...reportData, description: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 h-32"
                      placeholder="Describe what happened..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Your Name</label>
                      <input
                        type="text"
                        value={reportData.name}
                        onChange={(e) => setReportData({...reportData, name: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={reportData.phone}
                        onChange={(e) => setReportData({...reportData, phone: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        placeholder="555-0123"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition"
                  >
                    Submit Report
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Emergency Information</h3>
              <div className="space-y-2 text-gray-300">
                <p><strong className="text-white">Emergency:</strong> Call 911</p>
                <p><strong className="text-white">Non-Emergency:</strong> Use this portal to file a report</p>
                <p><strong className="text-white">Sheriff Office:</strong> Los Santos Sheriff Office</p>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto text-center text-gray-400 text-sm">
            Silver Lining Roleplay - Los Santos Sheriff Office
          </div>
        </footer>
      </div>
    );
  };

  if (!selectedRole) {
    return <RoleSelection />;
  }

  if (selectedRole === 'civilian') {
    return <CivilianInterface />;
  }

  const StatusButton = ({ status, label, code }) => {
    const isActive = selectedUnit && units.find(u => u.id === selectedUnit)?.status === status;
    return (
      <button
        onClick={() => selectedUnit && updateUnitStatus(selectedUnit, status)}
        disabled={!selectedUnit}
        className={`px-4 py-2 rounded font-semibold transition ${
          isActive 
            ? 'bg-blue-700 text-white' 
            : selectedUnit 
              ? 'bg-gray-700 text-white hover:bg-gray-600' 
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        {label} {code}
      </button>
    );
  };

  const RoleMenu = () => {
    return (
      <div className="fixed bottom-20 left-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 w-64 z-50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-bold">Menu</h3>
          <button onClick={() => setShowRoleMenu(false)} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-2">
          {selectedRole === 'police' && loggedInOfficer && (
            <>
              <div className="bg-gray-700 rounded p-3 mb-3">
                <div className="text-xs text-gray-400 mb-1">Logged in as:</div>
                <div className="text-white font-semibold">{loggedInOfficer.displayName}</div>
                <div className="text-sm text-gray-400">{units.find(u => u.id === selectedUnit)?.callsign}</div>
              </div>
              
              <button
                onClick={() => {
                  setLoggedInOfficer(null);
                  setSelectedUnit(null);
                  setSelectedRole(null);
                  setShowRoleMenu(false);
                }}
                className="w-full px-4 py-2 rounded text-left transition bg-orange-700 text-white hover:bg-orange-600"
              >
                <div className="font-semibold flex items-center gap-2">
                  <Lock size={16} />
                  Sign Out
                </div>
                <div className="text-xs text-gray-300">Return to role selection</div>
              </button>
            </>
          )}
          
          <button
            onClick={() => setShowExportImport(true)}
            className="w-full px-4 py-2 rounded text-left transition bg-blue-700 text-white hover:bg-blue-600"
          >
            <div className="font-semibold flex items-center gap-2">
              <Download size={16} />
              Export/Import Data
            </div>
            <div className="text-xs text-gray-300">Save or load your session</div>
          </button>
          
          {selectedRole !== 'police' && (
            <button
              onClick={() => setSelectedRole(null)}
              className="w-full px-4 py-2 rounded text-left transition bg-red-700 text-white hover:bg-red-600"
            >
              <div className="font-semibold">Exit to Role Selection</div>
              <div className="text-xs text-gray-300">Return to main menu</div>
            </button>
          )}
        </div>
      </div>
    );
  };

  const ExportImportModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Export/Import Data</h2>
            <button onClick={() => setShowExportImport(false)} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Download size={18} />
                Export Data
              </h3>
              <p className="text-gray-400 text-sm mb-3">
                Download all calls, units, officer credentials, and settings as a JSON file
              </p>
              <div className="bg-blue-900 border border-blue-500 rounded p-2 mb-3 text-xs text-blue-200">
                <strong>Note:</strong> Officer login credentials are included in the backup for admin purposes.
              </div>
              <button
                onClick={exportData}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Download Backup
              </button>
            </div>
            
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Upload size={18} />
                Import Data
              </h3>
              <p className="text-gray-400 text-sm mb-3">
                Load a previously exported backup file
              </p>
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UnitViewMode = () => {
    const myUnit = selectedUnit ? units.find(u => u.id === selectedUnit) : null;
    
    if (!myUnit) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-2xl bg-gray-800 rounded-lg p-8 border-2 border-yellow-500">
            <AlertCircle size={64} className="mx-auto mb-4 text-yellow-500" />
            <h2 className="text-2xl font-bold text-white mb-4">Unit Not Found</h2>
            <p className="text-gray-400 mb-6">
              Your assigned unit could not be found. Please contact your supervisor or dispatch.
            </p>
            <button
              onClick={() => {
                setLoggedInOfficer(null);
                setSelectedUnit(null);
                setSelectedRole(null);
              }}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    const activeCall = calls.find(c => c.assignedUnits.includes(myUnit.id) && c.status !== 'CLOSED');
    const callHistory = calls.filter(c => c.assignedUnits.includes(myUnit.id) && c.status === 'CLOSED');

    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6 border-2 border-blue-500">
          <h2 className="text-2xl font-bold text-white mb-4">Active Call</h2>
          
          {activeCall ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap pb-4 border-b border-gray-700">
                <span className="font-mono text-2xl font-bold text-white">{activeCall.id}</span>
                <span className={`${getPriorityColor(activeCall.priority)} text-white px-3 py-1 rounded-full text-sm font-bold`}>
                  PRIORITY {activeCall.priority}
                </span>
                {activeCall.primaryUnit === myUnit.id && (
                  <span className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-bold">PRIMARY UNIT</span>
                )}
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">{activeCall.callTitle}</span>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Call Type</div>
                <div className="text-xl font-bold text-white">{activeCall.code}</div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Location</div>
                <div className="flex items-start gap-2">
                  <MapPin size={20} className="text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-lg font-semibold text-white">{activeCall.address}</div>
                    {activeCall.postal && (
                      <div className="text-blue-400 font-mono text-sm mt-1">Postal: {activeCall.postal}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Time Dispatched</div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-blue-400" />
                  <div className="text-white font-semibold">{formatPSTDateTime(activeCall.timestamp)}</div>
                </div>
              </div>

              {(activeCall.caller || activeCall.phone) && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Caller Information</div>
                  <div className="space-y-1">
                    {activeCall.caller && (
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-blue-400" />
                        <span className="text-white">{activeCall.caller}</span>
                      </div>
                    )}
                    {activeCall.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-blue-400" />
                        <span className="text-white">{activeCall.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Call Description</div>
                <div className="text-white">{activeCall.description || 'No description provided'}</div>
              </div>

              {activeCall.callNotes && activeCall.callNotes.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <FileText size={16} />
                    Notes ({activeCall.callNotes.length})
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activeCall.callNotes.map((note, idx) => (
                      <div key={idx} className="bg-gray-800 rounded p-2">
                        <div className="text-xs text-gray-400 mb-1">
                          {formatPSTDateTime(note.timestamp)}
                        </div>
                        <div className="text-white text-sm whitespace-pre-wrap">{note.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedCall(activeCall)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition"
              >
                View Full Call Details
              </button>
            </div>
          ) : (
            <div className="space-y-4 opacity-50">
              <div className="text-center py-8">
                <AlertCircle size={64} className="mx-auto mb-4 text-gray-600" />
                <p className="text-xl font-semibold text-gray-400 mb-2">No Active Call</p>
                <p className="text-gray-500">You will see call details here when dispatch assigns you to a call</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText size={24} />
            Call History ({callHistory.length})
          </h3>
          
          {callHistory.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {callHistory.map(call => (
                <div
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 border-l-4 border-gray-600 transition"
                >
                  <div className="flex justify-between mb-2">
                    <div className="flex gap-2 flex-wrap">
                      <span className="font-mono text-gray-400">{call.id}</span>
                      <span className={`${getPriorityColor(call.priority)} text-white px-2 py-1 rounded text-sm opacity-75`}>
                        P{call.priority}
                      </span>
                      <span className="text-white font-semibold">{call.code}</span>
                      <span className="bg-gray-600 text-white px-2 py-1 rounded text-sm">CLOSED</span>
                    </div>
                    <span className="text-gray-400 text-sm">{formatPSTDate(call.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin size={16} />
                    <span>{call.address}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-700 rounded-lg p-8 text-center">
              <FileText size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No call history available</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const NewCallForm = () => {
    const [data, setData] = useState({
      callOrigin: 'CALLER', priority: '2', address: '', postal: '', callTitle: 'LE',
      code: 'CALL FOR SERVICE', description: '', caller: '', phone: ''
    });

    const availUnit = units.find(u => u.status === 'available' && !u.assignedCall);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Create New Call</h2>
            <button onClick={() => setShowNewCall(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
          </div>
          
          <div className="bg-blue-900 border border-blue-500 rounded p-3 mb-4 text-sm text-blue-200">
            Call ID: <span className="font-mono font-bold">{String(callIdCounter).padStart(6, '0')}</span>
            {availUnit && <> - Auto-assigned to <span className="font-bold">{availUnit.callsign}</span></>}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Call Origin</label>
                <select value={data.callOrigin} onChange={(e) => setData({...data, callOrigin: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2">
                  <option value="CALLER">CALLER</option>
                  <option value="RADIO DISPATCH">RADIO DISPATCH</option>
                  <option value="OBSERVED">OBSERVED</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Priority</label>
                <select value={data.priority} onChange={(e) => setData({...data, priority: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2">
                  <option value="1">Priority 1 (High)</option>
                  <option value="2">Priority 2 (Medium)</option>
                  <option value="3">Priority 3 (Low)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Type</label>
                <select value={data.callTitle} onChange={(e) => setData({...data, callTitle: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2">
                  <option value="LE">LE</option>
                  <option value="FD">FD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Code</label>
                <select value={data.code} onChange={(e) => setData({...data, code: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2">
                  {CALL_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-300 mb-1">Address</label>
                <input type="text" value={data.address} onChange={(e) => setData({...data, address: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Postal</label>
                <input type="text" value={data.postal} onChange={(e) => setData({...data, postal: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Caller</label>
                <input type="text" value={data.caller} onChange={(e) => setData({...data, caller: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Phone</label>
                <input type="tel" value={data.phone} onChange={(e) => setData({...data, phone: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <textarea value={data.description} onChange={(e) => setData({...data, description: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24" />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewCall(false)} className="px-4 py-2 bg-gray-600 text-white rounded">Cancel</button>
              <button onClick={() => createCall(data)} className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CallDetail = ({ call }) => {
    const [note, setNote] = useState('');
    const [pasteContent, setPasteContent] = useState('');
    const [showPasteModal, setShowPasteModal] = useState(false);
    const assigned = units.filter(u => call.assignedUnits.includes(u.id));

    const handleAddNote = () => {
      if (note.trim()) {
        addNote(call.id, note);
        setNote('');
      }
    };

    const handlePaste = () => {
      if (pasteContent.trim()) {
        const pasteNote = `📋 PASTED DOCUMENT:\n${pasteContent}`;
        addNote(call.id, pasteNote);
        setPasteContent('');
        setShowPasteModal(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white">{call.id}</h2>
              <span className={`${getPriorityColor(call.priority)} text-white px-2 py-1 rounded text-sm`}>P{call.priority}</span>
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">{call.status}</span>
            </div>
            <button onClick={() => setSelectedCall(null)} className="text-gray-400"><X size={24} /></button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-gray-700 rounded p-4">
                <h3 className="font-semibold text-white mb-2">Info</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Code:</span><span className="text-white">{call.code}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Time:</span><span className="text-white">{formatPSTDateTime(call.timestamp)}</span></div>
                </div>
              </div>

              <div className="bg-gray-700 rounded p-4">
                <h3 className="font-semibold text-white mb-2">Location</h3>
                <div className="text-white text-sm">{call.address}</div>
                {call.postal && <div className="text-gray-400 text-sm">Postal: {call.postal}</div>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-700 rounded p-4">
                <h3 className="font-semibold text-white mb-2">Assigned ({assigned.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {assigned.map(u => (
                    <div key={u.id} className="bg-gray-800 rounded p-2 flex justify-between">
                      <div className="text-white text-sm">{u.callsign}</div>
                      {call.primaryUnit !== u.id && selectedRole === 'dispatch' && (
                        <button onClick={() => setPrimary(call.id, u.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Primary</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedRole === 'dispatch' && (
                <div className="bg-gray-700 rounded p-4">
                  <h3 className="font-semibold text-white mb-2">Available</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {units.filter(u => !call.assignedUnits.includes(u.id)).map(u => (
                      <div key={u.id} className="bg-gray-800 rounded p-2 flex justify-between">
                        <div className="text-white text-sm">{u.callsign}</div>
                        <button onClick={() => assignUnit(call.id, u.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Assign</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <FileText size={18} />
              Call Notes
            </h3>
            <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
              {call.callNotes?.map((n, i) => (
                <div key={i} className="bg-gray-800 rounded p-3">
                  <div className="text-xs text-gray-400 mb-1">{formatPSTDateTime(n.timestamp)}</div>
                  <div className="text-white text-sm whitespace-pre-wrap">{n.text}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                placeholder="Add a note..." 
                className="flex-1 bg-gray-800 text-white rounded px-3 py-2 text-sm" 
              />
              <button onClick={handleAddNote} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Add</button>
              <button onClick={() => setShowPasteModal(true)} className="px-4 py-2 bg-green-600 text-white rounded text-sm">Paste</button>
            </div>
          </div>

          {call.status !== 'CLOSED' && selectedRole === 'dispatch' && (
            <button onClick={() => closeCall(call.id)} className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded">
              Close Call
            </button>
          )}
        </div>

        {showPasteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Paste Document</h3>
                <button onClick={() => setShowPasteModal(false)} className="text-gray-400"><X size={24} /></button>
              </div>
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="Paste information here..."
                className="w-full bg-gray-700 text-white rounded px-3 py-2 h-64 text-sm font-mono"
              />
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => setShowPasteModal(false)} className="px-4 py-2 bg-gray-600 text-white rounded">Cancel</button>
                <button onClick={handlePaste} className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const UnitInfoModal = ({ unit }) => {
    const [info, setInfo] = useState({
      callsign: unit.callsign || '',
      officer: unit.officer || '',
      aop: unit.aop || '',
      agency: unit.agency || '',
      rank: unit.rank || '',
      department: unit.department || '',
      location: unit.location || ''
    });

    const handleSave = () => {
      updateUnitInfo(unit.id, info);
      setShowUnitInfo(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Unit Information</h2>
            <button onClick={() => setShowUnitInfo(false)} className="text-gray-400"><X size={24} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Callsign</label>
              <input type="text" value={info.callsign} onChange={(e) => setInfo({...info, callsign: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Officer Name</label>
                <input type="text" value={info.officer} onChange={(e) => setInfo({...info, officer: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Rank</label>
                <input type="text" value={info.rank} onChange={(e) => setInfo({...info, rank: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Department</label>
              <select value={info.department} onChange={(e) => setInfo({...info, department: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2">
                <option value="">Select Department</option>
                {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Location</label>
              <input type="text" value={info.location} onChange={(e) => setInfo({...info, location: e.target.value})} className="w-full bg-gray-700 text-white rounded px-3 py-2" />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowUnitInfo(false)} className="px-4 py-2 bg-gray-600 text-white rounded">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 border-b-4 border-yellow-500 p-4">
        <div className="text-center mb-3">
          <h1 className="text-3xl font-bold text-yellow-400">Silver Lining Roleplay</h1>
          <p className="text-xl text-white">Los Santos Sheriff Office</p>
        </div>
        


        {selectedRole === 'police' && selectedUnit && loggedInOfficer && (
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            <button
              onClick={() => setShowUnitInfo(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded font-bold hover:bg-yellow-500 transition flex items-center gap-2 border-r-2 border-gray-600 mr-2"
            >
              <div className="text-left">
                <div className="text-sm font-bold">{units.find(u => u.id === selectedUnit)?.callsign}</div>
                <div className="text-xs">
                  <User size={12} className="inline mr-1" />
                  {loggedInOfficer.displayName}
                </div>
              </div>
            </button>
            <button
              onClick={() => updateUnitStatus(selectedUnit, 'busy')}
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              Busy 10-6
            </button>
            <button
              onClick={() => updateUnitStatus(selectedUnit, 'unavailable')}
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              Unavailable 10-7
            </button>
            <button
              onClick={() => updateUnitStatus(selectedUnit, 'available')}
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              Available 10-8
            </button>
            <button
              onClick={() => updateUnitStatus(selectedUnit, 'enroute')}
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              Enroute 10-76
            </button>
            <button
              onClick={() => updateUnitStatus(selectedUnit, 'onscene')}
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              On-Scene 10-23
            </button>
            <button
              onClick={() => updateUnitStatus(selectedUnit, 'panic')}
              className="px-4 py-2 rounded font-semibold transition bg-red-600 text-white hover:bg-red-700 animate-pulse"
            >
              <AlertTriangle size={18} className="inline mr-1" />
              PANIC
            </button>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {selectedRole === 'dispatch' && selectedUnit && (
              <button onClick={() => setShowUnitInfo(true)} className="px-4 py-2 bg-yellow-600 text-white rounded font-bold">
                {units.find(u => u.id === selectedUnit)?.callsign}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {selectedRole === 'dispatch' && (
              <>
                <button onClick={() => setActiveTab('dispatch')} className={`px-4 py-2 rounded ${activeTab === 'dispatch' ? 'bg-blue-600' : 'bg-gray-700'}`}>Dispatch</button>
                <button onClick={() => setActiveTab('units')} className={`px-4 py-2 rounded ${activeTab === 'units' ? 'bg-blue-600' : 'bg-gray-700'}`}>Units</button>
              </>
            )}
            {selectedRole === 'police' && (
              <button className="px-4 py-2 rounded bg-blue-600">My Unit</button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 pb-20">
        {selectedRole === 'police' && <UnitViewMode />}
        
        {selectedRole === 'dispatch' && activeTab === 'dispatch' && (
          <div>
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-semibold">Active Calls</h2>
              <button onClick={() => setShowNewCall(true)} className="px-4 py-2 bg-blue-600 rounded flex items-center gap-2">
                <Plus size={20} /> New Call
              </button>
            </div>
            <div className="grid gap-4">
              {calls.filter(c => c.status !== 'CLOSED').map(call => (
                <div key={call.id} onClick={() => setSelectedCall(call)} className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 border-l-4 border-blue-500">
                  <div className="flex justify-between mb-2">
                    <div className="flex gap-2">
                      <span className="font-mono text-gray-400">{call.id}</span>
                      <span className={`${getPriorityColor(call.priority)} text-white px-2 py-1 rounded text-sm`}>P{call.priority}</span>
                      <span className="text-white font-semibold">{call.code}</span>
                    </div>
                    <span className="text-gray-400 text-sm">{formatPSTTime(call.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin size={16} />
                    <span>{call.address}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedRole === 'dispatch' && activeTab === 'units' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Units</h2>
            
            <div className="mb-4 flex gap-2 flex-wrap">
              <span className="text-gray-400 text-sm">Select Unit:</span>
              {units.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUnit(u.id)}
                  className={`px-3 py-1 rounded font-bold text-sm ${selectedUnit === u.id ? 'bg-blue-700 text-white' : 'bg-gray-700 text-white'}`}
                >
                  {u.callsign}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {units.map(u => (
                <div key={u.id} className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{u.callsign}</h3>
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(u.status)}`}></div>
                  </div>
                  <div className="text-gray-400 text-sm">{u.officer}</div>
                  <div className={`text-sm font-semibold ${u.status === 'available' ? 'text-green-400' : 'text-blue-400'}`}>{getStatusLabel(u.status)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showRoleMenu && <RoleMenu />}
      {showExportImport && <ExportImportModal />}

      <footer className="bg-gray-800 border-t border-gray-700 p-4 fixed bottom-0 left-0 right-0">
        <div className="flex justify-between items-center">
          <button onClick={() => setShowRoleMenu(!showRoleMenu)} className="bg-gray-700 px-4 py-2 rounded">
            <div className="text-gray-400 text-xs">
              {selectedRole === 'police' && loggedInOfficer ? 'Officer' : 'Mode'}
            </div>
            <div className="text-white font-mono text-lg">
              {selectedRole === 'dispatch' ? 'Dispatch' : 
               selectedRole === 'police' && loggedInOfficer ? loggedInOfficer.displayName : 'Deputy'}
            </div>
          </button>
          <div className="bg-gray-700 px-4 py-2 rounded">
            <div className="text-gray-400 text-xs">Current Time (PST)</div>
            <div className="text-white font-mono text-lg">
              {currentTime.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: '2-digit', day: '2-digit', year: 'numeric' })} {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour12: true })}
            </div>
          </div>
        </div>
      </footer>

      {showRoleMenu && <RoleMenu />}
      {showExportImport && <ExportImportModal />}
      {showLogin && <PoliceLogin />}
      {showNewCall && <NewCallForm />}
      {selectedCall && <CallDetail call={selectedCall} />}
      {showUnitInfo && selectedUnit && <UnitInfoModal unit={units.find(u => u.id === selectedUnit)} />}
    </div>
  );
};

export default CADSystem;
