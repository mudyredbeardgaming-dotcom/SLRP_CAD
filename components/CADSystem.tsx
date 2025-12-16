import React, { useState, useEffect } from 'react';
import { AlertCircle, Radio, MapPin, Clock, User, Phone, FileText, Plus, X, Check, Shield, AlertTriangle, Lock, Download, Upload, LogOut, Search, Database, Pin, PinOff, Car, Flame, Truck } from 'lucide-react';

// App version - increment this to force re-login after updates
const APP_VERSION = '1.2.2';

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

  // Helper function for Records Panel date/time formatting
  const formatRecordDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Track if component has mounted (client-side)
  const [isClient, setIsClient] = useState(false);

  // Authentication state - start with false, will be updated after mount
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dispatch');
  const [userRole, setUserRole] = useState('dispatcher');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calls, setCalls] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [showNewCall, setShowNewCall] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [callIdCounter, setCallIdCounter] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [showUnitInfo, setShowUnitInfo] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [loggedInOfficer, setLoggedInOfficer] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(true);

  // Permission settings - can be controlled by admin
  const [permissions, setPermissions] = useState({
    canAccessDispatch: true,
    canAccessPolice: true
  });

  // Civilian characters state
  const [civilians, setCivilians] = useState<any[]>([]);
  const [selectedCivilian, setSelectedCivilian] = useState<any>(null);
  const [civilianView, setCivilianView] = useState('list'); // list, add, edit, detail
  const [characterForm, setCharacterForm] = useState<any>(null);
  const [showDMVModal, setShowDMVModal] = useState(false);
  const [selectedDMVType, setSelectedDMVType] = useState('');
  const [dmvRecordData, setDmvRecordData] = useState<any>({});

  // Records Management state (Police role)
  const [showRecordsMenu, setShowRecordsMenu] = useState(false);
  const [pinnedRecordsButtons, setPinnedRecordsButtons] = useState({
    lookup: false,
    records: false,
    bolo: false
  });
  const [activeRecordsPanel, setActiveRecordsPanel] = useState<string | null>(null); // 'lookup', 'records', 'bolo'

  // Records Panel state
  const [showNewReportDropdown, setShowNewReportDropdown] = useState(false);
  const [showNewRecordDropdown, setShowNewRecordDropdown] = useState(false);
  const [activeReportForm, setActiveReportForm] = useState<string | null>(null);
  const [activeRecordForm, setActiveRecordForm] = useState<string | null>(null);
  const [officerReports, setOfficerReports] = useState<any[]>([]);
  const [officerRecords, setOfficerRecords] = useState<any[]>([]);
  const [currentReportData, setCurrentReportData] = useState<any>({});
  const [currentRecordData, setCurrentRecordData] = useState<any>({});
  const [nextReportRecordId, setNextReportRecordId] = useState(10000);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Traffic Collision Report search states
  const [vehicleSearchPlate1, setVehicleSearchPlate1] = useState('');
  const [vehicleSearchPlate2, setVehicleSearchPlate2] = useState('');
  const [partySearchName1, setPartySearchName1] = useState('');
  const [partySearchName2, setPartySearchName2] = useState('');
  const [vehicleSearchResults1, setVehicleSearchResults1] = useState<any[]>([]);
  const [vehicleSearchResults2, setVehicleSearchResults2] = useState<any[]>([]);
  const [partySearchResults1, setPartySearchResults1] = useState<any[]>([]);
  const [partySearchResults2, setPartySearchResults2] = useState<any[]>([]);

  // Lookup Panel state
  const [lookupSearchQuery, setLookupSearchQuery] = useState('');
  const [lookupSearchResults, setLookupSearchResults] = useState<any[]>([]);
  const [selectedLookupPerson, setSelectedLookupPerson] = useState<any>(null);
  const [lookupVehicleQuery, setLookupVehicleQuery] = useState('');
  const [lookupVehicleResults, setLookupVehicleResults] = useState<any[]>([]);

  // Report and Record types
  const REPORT_TYPES = [
    'TRAFFIC COLLISION REPORT',
    'SUPPLEMENTAL REPORT',
    'USE OF FORCE REPORT',
    'GENERAL REPORT',
    'VEHICLE TOW/RELEASE REPORT',
    'DETECTIVE REQUEST FORM',
    'DETECTIVE REPORT',
    'TRESPASS WARNING',
    'RESTRAINING ORDER',
    'EVIDENCE LOCKER'
  ];

  const RECORD_TYPES = ['ARREST', 'BOLO', 'WARRANT', 'CITATION'];

  // DMV record types
  const DMV_RECORD_TYPES = [
    'VEHICLE REGISTRATION',
    'LICENSE',
    'MEDICAL HISTORY',
    'SECURITY GUARD LICENSE',
    'REGISTERED FIREARM',
    'OUT OF STATE WARRANT',
    'PROBATION',
    'PAROLE',
    'MEDICAL HAZARD'
  ];

  const HAIR_COLORS = ['BLACK', 'BLONDE', 'BROWN', 'RED', 'GRAY'];
  const EYE_COLORS = ['BLACK', 'BLUE', 'BROWN', 'GREEN', 'HAZEL'];

  // User login credentials - officers, firefighters, tow drivers
  // In production, this would be stored in a database with hashed passwords
  const [officerCredentials, setOfficerCredentials] = useState([
    // Police Officers
    {
      username: 'johnson',
      password: 'deputy123',
      unitId: 'Unit-1',
      displayName: 'Deputy Johnson',
      role: 'police',
      department: 'LSSO'
    },
    {
      username: 'smith',
      password: 'deputy123',
      unitId: 'Unit-2',
      displayName: 'Deputy Smith',
      role: 'police',
      department: 'LSSO'
    },
    {
      username: 'davis',
      password: 'deputy123',
      unitId: 'Unit-3',
      displayName: 'Deputy Davis',
      role: 'police',
      department: 'LSSO'
    },
    // Dispatcher
    {
      username: 'dispatcher',
      password: 'dispatch123',
      unitId: 'DISPATCH-1',
      displayName: 'Dispatcher Davis',
      role: 'dispatch',
      department: 'LSSO Communications'
    },
    // Firefighters
    {
      username: 'firefighter1',
      password: 'fire123',
      unitId: 'Engine-1',
      displayName: 'Firefighter Anderson',
      role: 'fire',
      department: 'LSFD'
    },
    {
      username: 'medic1',
      password: 'medic123',
      unitId: 'Medic-1',
      displayName: 'Paramedic Rodriguez',
      role: 'fire',
      department: 'LSFD'
    },
    // Tow Drivers
    {
      username: 'tow1',
      password: 'tow123',
      unitId: 'Tow-1',
      displayName: 'Mike (Towing)',
      role: 'tow',
      department: "Mike's Towing"
    },
    {
      username: 'tow2',
      password: 'tow123',
      unitId: 'Tow-2',
      displayName: 'Joe (Towing)',
      role: 'tow',
      department: 'Quick Tow'
    },
    // Admin Accounts
    {
      username: 'admin1',
      password: 'admin123',
      unitId: 'ADMIN-1',
      displayName: 'Admin One',
      role: 'admin',
      department: 'System Administration'
    },
    {
      username: 'admin2',
      password: 'admin123',
      unitId: 'ADMIN-2',
      displayName: 'Admin Two',
      role: 'admin',
      department: 'System Administration'
    }
  ]);

  // Logout function - clears session from localStorage
  const handleLogout = () => {
    localStorage.removeItem('cadSession');
    setIsAuthenticated(false);
    setLoggedInOfficer(null);
    setSelectedRole(null);
    setSelectedUnit(null);
    setShowLogin(true);
  };

  // Records Panel handler functions (moved to parent level to prevent re-render issues)
  const handleNewReport = (reportType: string) => {
    const recordId = nextReportRecordId;
    setNextReportRecordId(prev => prev + 1);
    setEditingReportId(null);
    setActiveReportForm(reportType);
    setCurrentReportData({
      type: reportType,
      recordNumber: recordId,
      officer: loggedInOfficer?.displayName || '',
      badge: loggedInOfficer?.badge || '',
      callsign: loggedInOfficer?.callsign || '',
      department: loggedInOfficer?.department || '',
      date: new Date().toISOString(),
      status: 'DRAFT',
      // Traffic Collision specific defaults
      vehicle1: {},
      vehicle2: {},
      party1: {},
      party2: {},
      coding: {},
      sceneImages: [],
      linkedReports: []
    });
    setShowNewReportDropdown(false);
    // Reset search states
    setVehicleSearchPlate1('');
    setVehicleSearchPlate2('');
    setPartySearchName1('');
    setPartySearchName2('');
    setVehicleSearchResults1([]);
    setVehicleSearchResults2([]);
    setPartySearchResults1([]);
    setPartySearchResults2([]);
  };

  const handleNewRecord = (recordType: string) => {
    const recordId = nextReportRecordId;
    setNextReportRecordId(prev => prev + 1);
    setEditingRecordId(null);
    setActiveRecordForm(recordType);
    setCurrentRecordData({
      type: recordType,
      recordNumber: recordId,
      officer: loggedInOfficer?.displayName || '',
      badge: loggedInOfficer?.badge || '',
      date: new Date().toISOString(),
      status: 'ACTIVE'
    });
    setShowNewRecordDropdown(false);
  };

  const openExistingReport = (report: any) => {
    setEditingReportId(report.id);
    setActiveReportForm(report.type);
    setCurrentReportData({ ...report });
    // Reset search states
    setVehicleSearchPlate1('');
    setVehicleSearchPlate2('');
    setPartySearchName1('');
    setPartySearchName2('');
    setVehicleSearchResults1([]);
    setVehicleSearchResults2([]);
    setPartySearchResults1([]);
    setPartySearchResults2([]);
  };

  const openExistingRecord = (record: any) => {
    setEditingRecordId(record.id);
    setActiveRecordForm(record.type);
    setCurrentRecordData({ ...record });
  };

  const saveReport = () => {
    if (editingReportId) {
      // Update existing report
      setOfficerReports(prev => prev.map(r =>
        r.id === editingReportId
          ? { ...currentReportData, updatedAt: new Date().toISOString() }
          : r
      ));
    } else {
      // Create new report
      const newReport = {
        ...currentReportData,
        id: `RPT-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setOfficerReports(prev => [...prev, newReport]);
    }
    setActiveReportForm(null);
    setCurrentReportData({});
    setEditingReportId(null);
  };

  const saveRecord = () => {
    if (editingRecordId) {
      // Update existing record
      setOfficerRecords(prev => prev.map(r =>
        r.id === editingRecordId
          ? { ...currentRecordData, updatedAt: new Date().toISOString() }
          : r
      ));
    } else {
      // Create new record
      const newRecord = {
        ...currentRecordData,
        id: `REC-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setOfficerRecords(prev => [...prev, newRecord]);
    }
    setActiveRecordForm(null);
    setCurrentRecordData({});
    setEditingRecordId(null);
  };

  // Traffic Collision Report helper functions
  const searchVehicleByPlate = (plateNumber: string, vehicleNumber: 1 | 2) => {
    // Search through all civilians' DMV records for vehicle registrations
    const results: any[] = [];
    civilians.forEach(civilian => {
      civilian.dmvRecords?.forEach((record: any) => {
        if (record.type === 'VEHICLE REGISTRATION' &&
            record.data?.plateNumber?.toLowerCase().includes(plateNumber.toLowerCase())) {
          results.push({
            plate: record.data.plateNumber,
            make: record.data.make,
            model: record.data.model,
            color: record.data.color,
            year: record.data.year,
            vin: record.data.vin,
            vehicleType: record.data.vehicleType,
            registrationStatus: record.data.registrationStatus,
            insuranceStatus: record.data.insuranceStatus,
            ownerName: `${civilian.firstName} ${civilian.lastName}`,
            ownerId: civilian.id
          });
        }
      });
    });
    if (vehicleNumber === 1) {
      setVehicleSearchResults1(results);
    } else {
      setVehicleSearchResults2(results);
    }
  };

  const searchPersonByName = (name: string, partyNumber: 1 | 2) => {
    const results = civilians.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(name.toLowerCase())
    );
    if (partyNumber === 1) {
      setPartySearchResults1(results);
    } else {
      setPartySearchResults2(results);
    }
  };

  const selectVehicle = (vehicle: any, vehicleNumber: 1 | 2) => {
    const vehicleKey = vehicleNumber === 1 ? 'vehicle1' : 'vehicle2';
    setCurrentReportData((prev: any) => ({
      ...prev,
      [vehicleKey]: {
        ...prev[vehicleKey],
        plate: vehicle.plate,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        year: vehicle.year,
        ownerName: vehicle.ownerName,
        ownerId: vehicle.ownerId
      }
    }));
    if (vehicleNumber === 1) {
      setVehicleSearchResults1([]);
      setVehicleSearchPlate1('');
    } else {
      setVehicleSearchResults2([]);
      setVehicleSearchPlate2('');
    }
  };

  const selectParty = (person: any, partyNumber: 1 | 2) => {
    const partyKey = partyNumber === 1 ? 'party1' : 'party2';
    // Find license info from DMV records if available
    const licenseRecord = person.dmvRecords?.find((r: any) => r.type === 'LICENSE');
    const licenseData = licenseRecord?.data || {};

    setCurrentReportData((prev: any) => ({
      ...prev,
      [partyKey]: {
        ...prev[partyKey],
        name: `${person.firstName} ${person.lastName}`,
        personId: person.id,
        dob: person.dob,
        address: person.address,
        phone: person.phone,
        licenseNumber: licenseData.licenseNumber || '',
        licenseStatus: licenseData.status || '',
        licenseType: licenseData.licenseType || ''
      }
    }));
    if (partyNumber === 1) {
      setPartySearchResults1([]);
      setPartySearchName1('');
    } else {
      setPartySearchResults2([]);
      setPartySearchName2('');
    }
  };

  const handleSceneImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: any[] = [];
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          newImages.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            data: event.target?.result,
            name: file.name,
            note: ''
          });
          if (newImages.length === files.length) {
            setCurrentReportData((prev: any) => ({
              ...prev,
              sceneImages: [...(prev.sceneImages || []), ...newImages]
            }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeSceneImage = (imageId: string) => {
    setCurrentReportData((prev: any) => ({
      ...prev,
      sceneImages: prev.sceneImages?.filter((img: any) => img.id !== imageId) || []
    }));
  };

  const updateImageNote = (imageId: string, note: string) => {
    setCurrentReportData((prev: any) => ({
      ...prev,
      sceneImages: prev.sceneImages?.map((img: any) =>
        img.id === imageId ? { ...img, note } : img
      ) || []
    }));
  };

  const addLinkedReport = () => {
    setCurrentReportData((prev: any) => ({
      ...prev,
      linkedReports: [...(prev.linkedReports || []), { type: '', number: '' }]
    }));
  };

  const removeLinkedReport = (index: number) => {
    setCurrentReportData((prev: any) => ({
      ...prev,
      linkedReports: prev.linkedReports?.filter((_: any, i: number) => i !== index) || []
    }));
  };

  // Load saved session and data on client mount (prevents hydration mismatch)
  useEffect(() => {
    setIsClient(true);
    try {
      // Load session
      const saved = localStorage.getItem('cadSession');
      if (saved) {
        const session = JSON.parse(saved);
        // Check if version matches - if not, require re-login
        if (session.version === APP_VERSION) {
          setIsAuthenticated(true);
          setSelectedRole(session.role || null);
          setSelectedUnit(session.unitId || null);
          setLoggedInOfficer(session.officer || null);
          setShowLogin(false);
        }
      }

      // Load persisted data from server
      fetch('/api/load-data')
        .then(res => res.json())
        .then(data => {
          if (data.units) setUnits(data.units);
          if (data.calls) setCalls(data.calls);
          if (data.civilians) setCivilians(data.civilians);
          if (data.officerReports) setOfficerReports(data.officerReports);
          if (data.officerRecords) setOfficerRecords(data.officerRecords);
          if (data.officerCredentials) setOfficerCredentials(data.officerCredentials);
        })
        .catch(e => console.error('Error loading data from server:', e));
    } catch (e) {
      console.error('Error loading saved data:', e);
    }
  }, []);

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
          location: 'Postal 1234',
          callHistory: []
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
          location: 'Postal 5678',
          callHistory: []
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
          location: 'Postal 9012',
          callHistory: []
        },
        {
          id: 'Engine-1',
          callsign: 'ENGINE-1',
          status: 'available',
          officer: 'Firefighter Anderson',
          assignedCall: null,
          aop: 'Station 1',
          agency: 'LSFD',
          rank: 'Firefighter',
          department: 'LSFD',
          location: 'Fire Station 1',
          callHistory: []
        },
        {
          id: 'Medic-1',
          callsign: 'MEDIC-1',
          status: 'available',
          officer: 'Paramedic Rodriguez',
          assignedCall: null,
          aop: 'EMS Station 1',
          agency: 'LSFD',
          rank: 'Paramedic',
          department: 'LSFD',
          location: 'EMS Station 1',
          callHistory: []
        },
        {
          id: 'Tow-1',
          callsign: 'TOW-1',
          status: 'available',
          officer: 'Mike (Towing)',
          assignedCall: null,
          aop: 'City Wide',
          agency: "Mike's Towing",
          rank: 'Driver',
          department: "Mike's Towing",
          location: 'Sandy Shores',
          callHistory: []
        },
        {
          id: 'Tow-2',
          callsign: 'TOW-2',
          status: 'available',
          officer: 'Joe (Towing)',
          assignedCall: null,
          aop: 'City Wide',
          agency: 'Quick Tow',
          rank: 'Driver',
          department: 'Quick Tow',
          location: 'Los Santos',
          callHistory: []
        }
      ];
      setUnits(initialUnits);
    }
  }, [selectedRole]);

  useEffect(() => {
    if (selectedRole) {
      // Only update clock when no modals or forms are open
      const isEditingCivilian = civilianView === 'add' || civilianView === 'edit';
      const shouldUpdateClock = !showLogin && !showNewCall && !selectedCall && !showUnitInfo && !isEditingCivilian;

      if (shouldUpdateClock) {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        if (selectedRole === 'police') {
          setActiveTab('unit-view');
        } else if (selectedRole === 'dispatch') {
          setActiveTab('dispatch');
        }

        return () => clearInterval(timer);
      }
    }
  }, [selectedRole, showLogin, showNewCall, selectedCall, showUnitInfo, civilianView]);

  // Helper function to save data immediately (for critical operations)
  const saveDataImmediately = (dataOverride?: any) => {
    if (!isClient) return;
    try {
      const data = dataOverride || {
        units,
        calls,
        civilians,
        officerReports,
        officerRecords,
        officerCredentials
      };
      console.log('🔴 IMMEDIATE SAVE - Calls count:', data.calls.length, 'Calls:', data.calls.map((c: any) => c.id));
      fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(() => console.log('✅ IMMEDIATE SAVE SUCCESS - Calls count:', data.calls.length))
        .catch(e => console.error('❌ Error saving data to server:', e));
    } catch (e) {
      console.error('❌ Error preparing data for save:', e);
    }
  };

  // Save data to server whenever it changes (debounced for non-critical updates)
  useEffect(() => {
    if (isClient) {
      console.log('⏳ DEBOUNCED SAVE - Scheduled in 1s - Calls count:', calls.length);
      const saveTimeout = setTimeout(() => {
        console.log('🟡 DEBOUNCED SAVE - Executing - Calls count:', calls.length);
        saveDataImmediately();
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(saveTimeout);
    }
  }, [units, calls, civilians, officerReports, officerRecords, officerCredentials, isClient]);

  // Periodic data refresh for multi-user sync (every 5 seconds)
  useEffect(() => {
    if (isClient && selectedRole) {
      const refreshInterval = setInterval(() => {
        // Only refresh when no modals or forms are open to avoid overwriting user input
        const isEditingCivilian = civilianView === 'add' || civilianView === 'edit';
        const canRefresh = !showLogin && !showNewCall && !selectedCall && !showUnitInfo && !isEditingCivilian && !activeReportForm && !activeRecordForm;

        if (canRefresh) {
          console.log('🔵 REFRESH - Loading data from server - Current calls count:', calls.length);
          fetch('/api/load-data')
            .then(res => res.json())
            .then(data => {
              console.log('🔵 REFRESH - Received data - Calls count:', data.calls?.length, 'Calls:', data.calls?.map((c: any) => c.id));
              if (data.units) setUnits(data.units);
              if (data.calls) setCalls(data.calls);
              if (data.civilians) setCivilians(data.civilians);
              if (data.officerReports) setOfficerReports(data.officerReports);
              if (data.officerRecords) setOfficerRecords(data.officerRecords);
              if (data.officerCredentials) setOfficerCredentials(data.officerCredentials);
              console.log('✅ REFRESH - Complete - New calls count:', data.calls?.length);
            })
            .catch(e => console.error('❌ Error refreshing data:', e));
        } else {
          console.log('⏸️ REFRESH - Skipped (modal/form open)');
        }
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(refreshInterval);
    }
  }, [isClient, selectedRole, showLogin, showNewCall, selectedCall, showUnitInfo, civilianView, activeReportForm, activeRecordForm]);

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

    const newCalls = [...calls, newCall];
    const newUnits = availableUnit
      ? units.map(u => u.id === availableUnit.id ? { ...u, assignedCall: callId, status: 'enroute' } : u)
      : units;

    console.log('📞 CREATE CALL - ID:', callId, '- Total calls will be:', newCalls.length);
    setCalls(newCalls);
    if (availableUnit) {
      setUnits(newUnits);
    }

    setCallIdCounter(callIdCounter + 1);
    setShowNewCall(false);

    console.log('📞 CREATE CALL - Triggering immediate save with', newCalls.length, 'calls');
    // Immediately save to prevent loss during refresh
    saveDataImmediately({
      units: newUnits,
      calls: newCalls,
      civilians,
      officerReports,
      officerRecords,
      officerCredentials
    });
  };

  const assignUnit = (callId, unitId) => {
    const newCalls = calls.map(call => {
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
    });

    const newUnits = units.map(unit => {
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
    });

    setCalls(newCalls);
    setUnits(newUnits);

    // Immediately save to prevent loss during refresh
    saveDataImmediately({
      units: newUnits,
      calls: newCalls,
      civilians,
      officerReports,
      officerRecords,
      officerCredentials
    });
  };

  const updateUnitStatus = (unitId, newStatus) => {
    setUnits(prevUnits => prevUnits.map(u => u.id === unitId ? { ...u, status: newStatus } : u));
  };

  const updateUnitInfo = (unitId, updatedInfo) => {
    setUnits(prevUnits => prevUnits.map(u => u.id === unitId ? { ...u, ...updatedInfo } : u));
  };

  const closeCall = (callId) => {
    const call = calls.find(c => c.id === callId);
    const newCalls = calls.map(c => c.id === callId ? { ...c, status: 'CLOSED' } : c);
    const newUnits = units.map(u => {
      if (u.assignedCall === callId || (call && call.assignedUnits.includes(u.id))) {
        const historyEntry = {
          callId: call.id,
          code: call.code,
          address: call.address,
          timestamp: call.timestamp,
          closedAt: new Date().toISOString(),
          role: call.primaryUnit === u.id ? 'PRIMARY' : 'BACKUP'
        };
        return {
          ...u,
          assignedCall: null,
          status: 'available',
          callHistory: [...(u.callHistory || []), historyEntry]
        };
      }
      return u;
    });

    setCalls(newCalls);
    setUnits(newUnits);

    // Immediately save to prevent loss during refresh
    saveDataImmediately({
      units: newUnits,
      calls: newCalls,
      civilians,
      officerReports,
      officerRecords,
      officerCredentials
    });
  };

  const unassignUnit = (callId, unitId) => {
    const call = calls.find(c => c.id === callId);
    if (!call) return;

    // Save call to unit's history before unassigning
    const historyEntry = {
      callId: call.id,
      code: call.code,
      address: call.address,
      timestamp: call.timestamp,
      unassignedAt: new Date().toISOString(),
      role: call.primaryUnit === unitId ? 'PRIMARY' : 'BACKUP',
      status: 'UNASSIGNED'
    };

    // Remove unit from call
    setCalls(calls.map(c => {
      if (c.id === callId) {
        const newAssigned = c.assignedUnits.filter(id => id !== unitId);
        return {
          ...c,
          assignedUnits: newAssigned,
          status: newAssigned.length > 0 ? 'ACTIVE' : 'PENDING',
          primaryUnit: c.primaryUnit === unitId ? (newAssigned[0] || null) : c.primaryUnit
        };
      }
      return c;
    }));

    // Update unit status and add to call history
    setUnits(units.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          assignedCall: null,
          status: 'available',
          callHistory: [...(u.callHistory || []), historyEntry]
        };
      }
      return u;
    }));
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
          const data = JSON.parse(e.target?.result as string);
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
      <div className="min-h-screen bg-gray-800 flex items-center justify-center p-4">
        <div className="text-center max-w-6xl">
          <div className="mb-8">
            <div className="mb-6">
              <img src="/SLRPLogo.png" alt="Silver Lining RP Logo" className="h-40 mx-auto" />
            </div>
            <h1 className="text-5xl font-bold text-yellow-400 mb-2">Silver Lining Roleplay</h1>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            <div className="relative">
              <button
                onClick={() => (loggedInOfficer?.role === 'dispatch' || loggedInOfficer?.role === 'admin') && setSelectedRole('dispatch')}
                disabled={loggedInOfficer?.role !== 'dispatch' && loggedInOfficer?.role !== 'admin'}
                className={`w-full bg-gray-800 rounded-lg p-6 border-4 transition transform hover:scale-105 ${
                  (loggedInOfficer?.role === 'dispatch' || loggedInOfficer?.role === 'admin')
                    ? 'border-green-500 hover:border-green-400 cursor-pointer'
                    : 'border-gray-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <img src="/COMLogo.png" alt="Dispatch" className={`h-12 w-12 mx-auto mb-3 ${(loggedInOfficer?.role !== 'dispatch' && loggedInOfficer?.role !== 'admin') ? 'opacity-50' : ''}`} />
                <h3 className="text-xl font-bold text-white mb-2">Dispatch</h3>
              </button>
            </div>

            <div>
              <button
                onClick={() => setSelectedRole('civilian')}
                className="w-full bg-gray-800 rounded-lg p-6 border-4 border-purple-500 hover:border-purple-400 transition transform hover:scale-105 cursor-pointer"
              >
                <img src="/CIVLogo.png" alt="Civilian" className="h-12 w-12 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Civilian</h3>
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  if ((permissions.canAccessPolice && loggedInOfficer?.role === 'police') || loggedInOfficer?.role === 'admin') {
                    setSelectedRole('police');
                  }
                }}
                disabled={(!permissions.canAccessPolice && loggedInOfficer?.role !== 'admin') || (loggedInOfficer?.role !== 'police' && loggedInOfficer?.role !== 'admin')}
                className={`w-full bg-gray-800 rounded-lg p-6 border-4 transition transform hover:scale-105 ${
                  (permissions.canAccessPolice && loggedInOfficer?.role === 'police') || loggedInOfficer?.role === 'admin'
                    ? 'border-blue-500 hover:border-blue-400 cursor-pointer'
                    : 'border-gray-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <img src="/LSSOLogo.png" alt="Sheriff" className={`h-12 w-12 mx-auto mb-3 ${((!permissions.canAccessPolice && loggedInOfficer?.role !== 'admin') || (loggedInOfficer?.role !== 'police' && loggedInOfficer?.role !== 'admin')) ? 'opacity-50' : ''}`} />
                <h3 className="text-xl font-bold text-white mb-2">Sheriff</h3>
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  if (loggedInOfficer?.role === 'fire' || loggedInOfficer?.role === 'admin') {
                    setSelectedRole('fire');
                  }
                }}
                disabled={loggedInOfficer?.role !== 'fire' && loggedInOfficer?.role !== 'admin'}
                className={`w-full bg-gray-800 rounded-lg p-6 border-4 transition transform hover:scale-105 ${
                  (loggedInOfficer?.role === 'fire' || loggedInOfficer?.role === 'admin')
                    ? 'border-red-500 hover:border-red-400 cursor-pointer'
                    : 'border-gray-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <img src="/LSFDLogo.png" alt="Fire/EMS" className={`h-12 w-12 mx-auto mb-3 ${(loggedInOfficer?.role !== 'fire' && loggedInOfficer?.role !== 'admin') ? 'opacity-50' : ''}`} />
                <h3 className="text-xl font-bold text-white mb-2">Fire/EMS</h3>
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  if (loggedInOfficer?.role === 'tow' || loggedInOfficer?.role === 'admin') {
                    setSelectedRole('tow');
                  }
                }}
                disabled={loggedInOfficer?.role !== 'tow' && loggedInOfficer?.role !== 'admin'}
                className={`w-full bg-gray-800 rounded-lg p-6 border-4 transition transform hover:scale-105 ${
                  (loggedInOfficer?.role === 'tow' || loggedInOfficer?.role === 'admin')
                    ? 'border-orange-500 hover:border-orange-400 cursor-pointer'
                    : 'border-gray-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <img src="/TOWLogo.png" alt="Tow" className={`h-12 w-12 mx-auto mb-3 ${loggedInOfficer?.role !== 'tow' && loggedInOfficer?.role !== 'admin' ? 'opacity-50' : ''}`} />
                <h3 className="text-xl font-bold text-white mb-2">Tow</h3>
              </button>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => {
                setLoggedInOfficer(null);
                setSelectedRole(null);
                setShowLogin(true);
                localStorage.removeItem('cadSession');
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Sign Out
            </button>
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
        // Save session to localStorage (role will be selected after login)
        const session = {
          version: APP_VERSION,
          officer: officer,
          unitId: officer.unitId,
          role: null, // Role selected after login
          loginTime: new Date().toISOString()
        };
        localStorage.setItem('cadSession', JSON.stringify(session));

        setLoggedInOfficer(officer);
        setSelectedUnit(officer.unitId);
        setSelectedRole(null); // Go to role selection
        setIsAuthenticated(true);
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
        <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border-4 border-cyan-500">
          <div className="text-center mb-6">
            <img src="/SLRPLogo.png" alt="Silver Lining RP" className="h-24 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Silver Lining Role-Play</h2>
            <p className="text-xs text-gray-500 mt-2">Version {APP_VERSION}</p>
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
                onChange={(e) => {
                  e.stopPropagation();
                  setCredentials({...credentials, username: e.target.value});
                }}
                onKeyPress={handleKeyPress}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter your username"
                autoComplete="off"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={(e) => {
                    e.stopPropagation();
                    setCredentials({...credentials, password: e.target.value});
                  }}
                  onKeyPress={handleKeyPress}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter your password"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPassword(!showPassword);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <Lock size={20} /> : <Lock size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg font-bold hover:bg-cyan-500 transition text-lg"
            >
              Sign In
            </button>
          </div>

          <div className="mt-6 bg-gray-700 rounded p-4 hidden">
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

  const renderCivilianInterface = () => {
    const emptyCharacter = {
      id: null,
      photo: null,
      firstName: '',
      lastName: '',
      middleInitial: '',
      dateOfBirth: '',
      sex: 'M',
      aka: '',
      streetResidence: '',
      postalCode: '',
      height: '',
      weight: '',
      hairColor: 'BLACK',
      eyeColor: 'BROWN',
      scarsMarksTattoos: '',
      cellPhone: '',
      organDonor: false,
      deceased: false,
      records: [],
      dmvRecords: []
    };

    // Use parent state, initialize form if null
    const currentForm = characterForm || emptyCharacter;

    const handlePhotoUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCharacterForm({ ...currentForm, photo: reader.result });
        };
        reader.readAsDataURL(file);
      }
    };

    const saveCharacter = () => {
      if (!currentForm.firstName || !currentForm.lastName) {
        alert('First name and last name are required');
        return;
      }

      if (currentForm.id) {
        // Edit existing
        setCivilians(civilians.map(c => c.id === currentForm.id ? currentForm : c));
      } else {
        // Add new
        const newCharacter = {
          ...currentForm,
          id: `CIV-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        setCivilians([...civilians, newCharacter]);
      }
      setCharacterForm(null);
      setCivilianView('list');
    };

    const deleteCharacter = (id) => {
      if (confirm('Are you sure you want to delete this character?')) {
        setCivilians(civilians.filter(c => c.id !== id));
        if (selectedCivilian?.id === id) {
          setSelectedCivilian(null);
        }
        setCharacterForm(null);
        setCivilianView('list');
      }
    };

    const addDMVRecord = () => {
      if (!selectedDMVType || !selectedCivilian) return;

      const newRecord = {
        id: `DMV-${Date.now()}`,
        type: selectedDMVType,
        data: dmvRecordData,
        createdAt: new Date().toISOString(),
        // Link to character
        characterId: selectedCivilian.id,
        characterName: `${selectedCivilian.firstName} ${selectedCivilian.lastName}`
      };

      const updatedCivilian = {
        ...selectedCivilian,
        dmvRecords: [...(selectedCivilian.dmvRecords || []), newRecord]
      };

      setCivilians(civilians.map(c => c.id === selectedCivilian.id ? updatedCivilian : c));
      setSelectedCivilian(updatedCivilian);
      setShowDMVModal(false);
      setSelectedDMVType('');
      setDmvRecordData({});
    };

    const deleteDMVRecord = (recordId) => {
      const updatedCivilian = {
        ...selectedCivilian,
        dmvRecords: selectedCivilian.dmvRecords.filter(r => r.id !== recordId)
      };
      setCivilians(civilians.map(c => c.id === selectedCivilian.id ? updatedCivilian : c));
      setSelectedCivilian(updatedCivilian);
    };

    // Character List View
    const renderCharacterList = () => (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">My Characters</h2>
          <button
            onClick={() => {
              setCharacterForm({...emptyCharacter});
              setCivilianView('add');
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 flex items-center gap-2"
          >
            <Plus size={20} />
            New Character
          </button>
        </div>

        {civilians.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <User size={64} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Characters Yet</h3>
            <p className="text-gray-500 mb-4">Create your first character to get started</p>
            <button
              onClick={() => {
                setCharacterForm({...emptyCharacter});
                setCivilianView('add');
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500"
            >
              Create Character
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {civilians.map(char => (
              <div
                key={char.id}
                onClick={() => {
                  setSelectedCivilian(char);
                  setCivilianView('detail');
                }}
                className={`bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition border-2 ${
                  char.deceased ? 'border-red-600 opacity-75' : 'border-gray-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    {char.photo ? (
                      <img src={char.photo} alt={char.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={32} className="text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white truncate">
                        {char.firstName} {char.middleInitial ? `${char.middleInitial}.` : ''} {char.lastName}
                      </h3>
                      {char.deceased && (
                        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded">DECEASED</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">DOB: {char.dateOfBirth || 'N/A'}</p>
                    <p className="text-gray-500 text-xs">{char.streetResidence || 'No address'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );

    // Character Form (Add/Edit)
    const renderCharacterForm = () => (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
            {currentForm.id ? 'Edit Character' : 'New Character'}
          </h2>
          <button
            onClick={() => {
              setCharacterForm(null);
              setCivilianView('list');
            }}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          {/* Photo Upload */}
          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-700">
            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
              {currentForm.photo ? (
                <img src={currentForm.photo} alt="Character" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={48} className="text-gray-500" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Character Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-500"
              />
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="col-span-1">
              <label className="block text-sm text-gray-300 mb-1">First Name *</label>
              <input
                type="text"
                value={currentForm.firstName}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, firstName: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm text-gray-300 mb-1">M.I.</label>
              <input
                type="text"
                value={currentForm.middleInitial}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, middleInitial: e.target.value.slice(0, 1).toUpperCase()});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={1}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Last Name *</label>
              <input
                type="text"
                value={currentForm.lastName}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, lastName: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* DOB, Sex, AKA */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Date of Birth</label>
              <input
                type="date"
                value={currentForm.dateOfBirth}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, dateOfBirth: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Sex</label>
              <select
                value={currentForm.sex}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, sex: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">AKA (Also Known As)</label>
              <input
                type="text"
                value={currentForm.aka}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, aka: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Street Residence</label>
              <input
                type="text"
                value={currentForm.streetResidence}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, streetResidence: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Postal Code</label>
              <input
                type="text"
                value={currentForm.postalCode}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, postalCode: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Physical Description */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Height</label>
              <input
                type="text"
                value={currentForm.height}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, height: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="5'10&quot;"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Weight</label>
              <input
                type="text"
                value={currentForm.weight}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, weight: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="180 lbs"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Hair Color</label>
              <select
                value={currentForm.hairColor}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, hairColor: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {HAIR_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Eye Color</label>
              <select
                value={currentForm.eyeColor}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, eyeColor: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {EYE_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Scars/Marks/Tattoos */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1">Scars / Marks / Tattoos</label>
            <textarea
              value={currentForm.scarsMarksTattoos}
              onChange={(e) => {
                e.stopPropagation();
                setCharacterForm({...currentForm, scarsMarksTattoos: e.target.value});
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 h-20 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Describe any identifying marks..."
            />
          </div>

          {/* Contact & Other */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Cell Contact Number</label>
              <input
                type="tel"
                value={currentForm.cellPhone}
                onChange={(e) => {
                  e.stopPropagation();
                  setCharacterForm({...currentForm, cellPhone: e.target.value});
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="555-0123"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentForm.organDonor}
                  onChange={(e) => {
                    e.stopPropagation();
                    setCharacterForm({...currentForm, organDonor: e.target.checked});
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                />
                <span className="text-gray-300">Organ Donor</span>
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentForm.deceased}
                  onChange={(e) => {
                    e.stopPropagation();
                    setCharacterForm({...currentForm, deceased: e.target.checked});
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                />
                <span className="text-red-400">Deceased</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={saveCharacter}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500"
            >
              {currentForm.id ? 'Save Changes' : 'Create Character'}
            </button>
            <button
              onClick={() => {
                setCharacterForm(null);
                setCivilianView('list');
              }}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );

    // Character Detail View
    const renderCharacterDetail = () => {
      if (!selectedCivilian) return null;
      const char = civilians.find(c => c.id === selectedCivilian.id) || selectedCivilian;

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                setSelectedCivilian(null);
                setCharacterForm(null);
                setCivilianView('list');
              }}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <X size={20} />
              Back to Characters
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCharacterForm({...char});
                  setCivilianView('edit');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Edit
              </button>
              <button
                onClick={() => deleteCharacter(char.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Character Info Card */}
          <div className={`bg-gray-800 rounded-lg p-6 border-2 ${char.deceased ? 'border-red-600' : 'border-gray-700'}`}>
            {char.deceased && (
              <div className="bg-red-900 border border-red-600 rounded p-3 mb-4 text-center">
                <span className="text-red-400 font-bold text-lg">⚠️ DECEASED</span>
              </div>
            )}

            <div className="flex gap-6">
              {/* Photo */}
              <div className="w-40 h-48 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                {char.photo ? (
                  <img src={char.photo} alt={char.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={64} className="text-gray-500" />
                  </div>
                )}
              </div>

              {/* Info Grid */}
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">First Name</label>
                  <p className="text-white font-semibold">{char.firstName || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">M.I.</label>
                  <p className="text-white font-semibold">{char.middleInitial || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Last Name</label>
                  <p className="text-white font-semibold">{char.lastName || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Date of Birth</label>
                  <p className="text-white">{char.dateOfBirth || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Sex</label>
                  <p className="text-white">{char.sex === 'M' ? 'Male' : 'Female'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">AKA</label>
                  <p className="text-white">{char.aka || '-'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Street Residence</label>
                  <p className="text-white">{char.streetResidence || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Postal Code</label>
                  <p className="text-white">{char.postalCode || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Height</label>
                  <p className="text-white">{char.height || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Weight</label>
                  <p className="text-white">{char.weight || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Hair Color</label>
                  <p className="text-white">{char.hairColor || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Eye Color</label>
                  <p className="text-white">{char.eyeColor || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Cell Phone</label>
                  <p className="text-white">{char.cellPhone || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Organ Donor</label>
                  <p className={char.organDonor ? 'text-green-400' : 'text-gray-400'}>{char.organDonor ? 'Yes' : 'No'}</p>
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-gray-500">Scars / Marks / Tattoos</label>
                  <p className="text-white">{char.scarsMarksTattoos || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* DMV Records Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">DMV Records</h3>
              <div className="flex gap-2">
                <select
                  value={selectedDMVType}
                  onChange={(e) => setSelectedDMVType(e.target.value)}
                  className="bg-gray-700 text-white rounded px-3 py-2"
                >
                  <option value="">Select Record Type...</option>
                  {DMV_RECORD_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button
                  onClick={() => selectedDMVType && setShowDMVModal(true)}
                  disabled={!selectedDMVType}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {char.dmvRecords && char.dmvRecords.length > 0 ? (
              <div className="space-y-3">
                {char.dmvRecords.map(record => (
                  <div key={record.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-1 rounded text-sm font-semibold ${
                            record.type.includes('WARRANT') || record.type.includes('PROBATION') || record.type.includes('PAROLE')
                              ? 'bg-red-600 text-white'
                              : record.type.includes('HAZARD')
                              ? 'bg-orange-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}>
                            {record.type === 'LICENSE' && record.data.licenseType ? record.data.licenseType : record.type}
                          </span>
                          {record.type === 'LICENSE' && record.data.status && (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              record.data.status === 'VALID' ? 'bg-green-600 text-white' :
                              record.data.status === 'PENDING' ? 'bg-yellow-600 text-white' :
                              record.data.status === 'EXPIRED' ? 'bg-gray-600 text-white' :
                              'bg-red-600 text-white'
                            }`}>
                              {record.data.status}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mt-2">Added: {formatPSTDateTime(record.createdAt)}</p>

                        {/* LICENSE specific fields */}
                        {record.type === 'LICENSE' && (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                            {record.data.licenseClass && (
                              <p className="text-white">Class: <span className="text-gray-300">{record.data.licenseClass}</span></p>
                            )}
                            {record.data.motorcycleEndorsement && record.data.motorcycleEndorsement !== 'NONE' && (
                              <p className="text-white">Motorcycle: <span className="text-gray-300">{record.data.motorcycleEndorsement}</span></p>
                            )}
                            {record.data.expirationDate && (
                              <p className="text-white">Expires: <span className="text-gray-300">{record.data.expirationDate}</span></p>
                            )}
                            {record.data.restrictions && (
                              <p className="text-white col-span-2">Restrictions: <span className="text-gray-300">{record.data.restrictions}</span></p>
                            )}
                          </div>
                        )}

                        {/* Vehicle Registration fields */}
                        {record.type === 'VEHICLE REGISTRATION' && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {record.data.registrationStatus && (
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  record.data.registrationStatus === 'VALID' ? 'bg-green-600 text-white' :
                                  record.data.registrationStatus === 'PENDING' ? 'bg-yellow-600 text-white' :
                                  record.data.registrationStatus === 'TAGS STOLEN' ? 'bg-red-600 text-white' :
                                  record.data.registrationStatus === 'SUSPENDED' ? 'bg-red-600 text-white' :
                                  'bg-gray-600 text-white'
                                }`}>
                                  REG: {record.data.registrationStatus}
                                </span>
                              )}
                              {record.data.insuranceStatus && (
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  record.data.insuranceStatus === 'VALID' ? 'bg-green-600 text-white' :
                                  record.data.insuranceStatus === 'PENDING' ? 'bg-yellow-600 text-white' :
                                  record.data.insuranceStatus === 'NONE ON FILE' ? 'bg-red-600 text-white' :
                                  'bg-gray-600 text-white'
                                }`}>
                                  INS: {record.data.insuranceStatus}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              {record.data.plateNumber && (
                                <p className="text-white">Plate: <span className="text-gray-300">{record.data.plateNumber}</span></p>
                              )}
                              {record.data.vehicleType && (
                                <p className="text-white">Type: <span className="text-gray-300">{record.data.vehicleType}</span></p>
                              )}
                              {record.data.year && record.data.make && record.data.model && (
                                <p className="text-white col-span-2">Vehicle: <span className="text-gray-300">{record.data.year} {record.data.make} {record.data.model}</span></p>
                              )}
                              {record.data.color && (
                                <p className="text-white">Color: <span className="text-gray-300">{record.data.color}</span></p>
                              )}
                              {record.data.vin && (
                                <p className="text-white">VIN: <span className="text-gray-300 font-mono text-xs">{record.data.vin}</span></p>
                              )}
                              {record.data.registrationExpiration && (
                                <p className="text-white">Reg Exp: <span className="text-gray-300">{record.data.registrationExpiration}</span></p>
                              )}
                              {record.data.insuranceExpiration && (
                                <p className="text-white">Ins Exp: <span className="text-gray-300">{record.data.insuranceExpiration}</span></p>
                              )}
                            </div>
                          </div>
                        )}
                        {record.type !== 'VEHICLE REGISTRATION' && record.data.plateNumber && (
                          <p className="text-white mt-1">Plate: {record.data.plateNumber}</p>
                        )}
                        {record.type !== 'VEHICLE REGISTRATION' && record.data.vehicleDescription && (
                          <p className="text-gray-300 mt-1">{record.data.vehicleDescription}</p>
                        )}

                        {/* Security Guard License fields */}
                        {record.data.licenseNumber && (
                          <p className="text-white mt-1">License #: {record.data.licenseNumber}</p>
                        )}

                        {/* Firearm fields */}
                        {record.type === 'REGISTERED FIREARM' && (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {record.data.weaponType && (
                                <span className="px-2 py-0.5 bg-gray-600 text-white rounded text-xs">{record.data.weaponType}</span>
                              )}
                              {record.data.concealPermitStatus && record.data.concealPermitStatus !== 'NONE' && (
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  record.data.concealPermitStatus === 'APPROVED' ? 'bg-green-600 text-white' :
                                  record.data.concealPermitStatus === 'PENDING' ? 'bg-yellow-600 text-white' :
                                  'bg-red-600 text-white'
                                }`}>
                                  CCW: {record.data.concealPermitStatus}
                                </span>
                              )}
                              {record.data.firearmSeized === 'YES' && (
                                <span className="px-2 py-0.5 bg-red-600 text-white rounded text-xs font-bold">SEIZED</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              {record.data.weaponName && (
                                <p className="text-white">Weapon: <span className="text-gray-300">{record.data.weaponName}</span></p>
                              )}
                              {record.data.serialNumber && (
                                <p className="text-white">Serial: <span className="text-gray-300 font-mono">{record.data.serialNumber}</span></p>
                              )}
                              {record.data.purchaseLocation && (
                                <p className="text-white col-span-2">Acquired: <span className="text-gray-300">{record.data.purchaseLocation}</span></p>
                              )}
                            </div>
                            {/* Conceal Carry Info - Only show if has data */}
                            {record.data.concealPermitStatus && record.data.concealPermitStatus !== 'NONE' && (
                              <div className="mt-2 pt-2 border-t border-gray-600 text-sm">
                                <p className="text-yellow-400 text-xs font-semibold mb-1">CONCEAL CARRY PERMIT</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  {record.data.authorizingOfficialName && (
                                    <p className="text-white">Auth. Official: <span className="text-gray-300">{record.data.authorizingOfficialName}</span></p>
                                  )}
                                  {record.data.authorizingAgency && (
                                    <p className="text-white">Agency: <span className="text-gray-300">{record.data.authorizingAgency}</span></p>
                                  )}
                                  {record.data.authorizedFirearmName && (
                                    <p className="text-white">Auth. Firearm: <span className="text-gray-300">{record.data.authorizedFirearmName}</span></p>
                                  )}
                                  {record.data.authorizedFirearmSerial && (
                                    <p className="text-white">Auth. Serial: <span className="text-gray-300 font-mono">{record.data.authorizedFirearmSerial}</span></p>
                                  )}
                                </div>
                              </div>
                            )}
                            {/* Law Enforcement Info - Only show if seized */}
                            {record.data.firearmSeized === 'YES' && (
                              <div className="mt-2 pt-2 border-t border-gray-600 text-sm">
                                <p className="text-red-400 text-xs font-semibold mb-1">LAW ENFORCEMENT</p>
                                {record.data.evidenceLockerNumber && (
                                  <p className="text-white">Evidence Locker: <span className="text-gray-300 font-mono">{record.data.evidenceLockerNumber}</span></p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {record.type !== 'REGISTERED FIREARM' && record.data.firearmType && (
                          <p className="text-white mt-1">Type: {record.data.firearmType}</p>
                        )}
                        {record.type !== 'REGISTERED FIREARM' && record.data.serialNumber && (
                          <p className="text-white mt-1">Serial: {record.data.serialNumber}</p>
                        )}

                        {/* Medical History fields */}
                        {record.type === 'MEDICAL HISTORY' && (
                          <div className="mt-2 space-y-3">
                            {/* Medical Conditions */}
                            <div className="flex flex-wrap gap-2">
                              {record.data.highBloodPressure === 'YES' && (
                                <span className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">High Blood Pressure</span>
                              )}
                              {record.data.heartAttackHistory === 'YES' && (
                                <span className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">Heart Attack History</span>
                              )}
                              {record.data.highCholesterol === 'YES' && (
                                <span className="px-2 py-0.5 bg-orange-600 text-white rounded text-xs">High Cholesterol</span>
                              )}
                              {record.data.strokeHistory === 'YES' && (
                                <span className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">Stroke History</span>
                              )}
                              {record.data.cancerHistory === 'YES' && (
                                <span className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">Cancer History</span>
                              )}
                              {record.data.diabetes === 'YES' && (
                                <span className="px-2 py-0.5 bg-orange-600 text-white rounded text-xs">Diabetes</span>
                              )}
                            </div>
                            {/* Medication/Usage */}
                            <div className="flex flex-wrap gap-2">
                              {record.data.bloodThinner === 'YES' && (
                                <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-xs">Blood Thinner</span>
                              )}
                              {record.data.antiDepressant === 'YES' && (
                                <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-xs">Anti-Depressant</span>
                              )}
                              {record.data.recreationalDrugs === 'YES' && (
                                <span className="px-2 py-0.5 bg-yellow-600 text-white rounded text-xs">Rec. Drug Use</span>
                              )}
                              {record.data.alcoholUsage === 'YES' && (
                                <span className="px-2 py-0.5 bg-yellow-600 text-white rounded text-xs">Alcohol Use</span>
                              )}
                              {record.data.tobaccoUsage === 'YES' && (
                                <span className="px-2 py-0.5 bg-yellow-600 text-white rounded text-xs">Tobacco Use</span>
                              )}
                              {record.data.packsPerDay && record.data.packsPerDay !== 'NONE' && (
                                <span className="px-2 py-0.5 bg-gray-600 text-white rounded text-xs">{record.data.packsPerDay} packs/day</span>
                              )}
                            </div>
                            {/* Text fields */}
                            <div className="text-sm space-y-1">
                              {record.data.otherMedicalHistory && (
                                <p className="text-white">Other History: <span className="text-gray-300">{record.data.otherMedicalHistory}</span></p>
                              )}
                              {record.data.currentMedications && (
                                <p className="text-white">Current Meds: <span className="text-gray-300">{record.data.currentMedications}</span></p>
                              )}
                              {record.data.medicationAllergies && (
                                <p className="text-white">Allergies: <span className="text-red-400">{record.data.medicationAllergies}</span></p>
                              )}
                              {record.data.dateUpdated && (
                                <p className="text-gray-400">Last Updated: {record.data.dateUpdated}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Out Of State Warrant fields */}
                        {record.type === 'OUT OF STATE WARRANT' && (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {record.data.warrantActive && (
                                <span className="px-2 py-0.5 bg-red-600 text-white rounded text-xs font-bold animate-pulse">ACTIVE WARRANT</span>
                              )}
                              {record.data.warrantOutOf && (
                                <span className="px-2 py-0.5 bg-gray-600 text-white rounded text-xs">Out of: {record.data.warrantOutOf}</span>
                              )}
                              {record.data.extraditable && (
                                <span className={`px-2 py-0.5 rounded text-xs ${record.data.extraditable === 'YES' ? 'bg-red-600' : 'bg-yellow-600'} text-white`}>
                                  {record.data.extraditable === 'YES' ? 'EXTRADITABLE' : 'NON-EXTRADITABLE'}
                                </span>
                              )}
                            </div>

                            {/* Charges List */}
                            {record.data.charges && record.data.charges.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-600">
                                <p className="text-red-400 text-xs font-semibold mb-2">CHARGES ({record.data.charges.length})</p>
                                <div className="space-y-1">
                                  {record.data.charges.map((charge, idx) => (
                                    <div key={idx} className="bg-gray-600 rounded px-2 py-1 text-xs">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className={`px-1.5 py-0.5 rounded text-xs mr-2 ${
                                            charge.chargeType === 'FELONY' ? 'bg-red-600' :
                                            charge.chargeType === 'MISDEMEANOR' ? 'bg-orange-600' :
                                            'bg-yellow-600'
                                          } text-white`}>
                                            {charge.chargeType}
                                          </span>
                                          <span className="text-white font-semibold">{charge.charge}</span>
                                          {charge.counts > 1 && <span className="text-gray-400 ml-1">(x{charge.counts})</span>}
                                          {charge.titleCode && <span className="text-gray-400 ml-2">[{charge.titleCode}]</span>}
                                        </div>
                                        <div className="text-right">
                                          {charge.bondAmount > 0 && (
                                            <span className="text-green-400">${parseFloat(charge.bondAmount).toLocaleString()}</span>
                                          )}
                                          {charge.jailTime && (
                                            <span className="text-gray-400 ml-2">{charge.jailTime}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {/* Fine Total */}
                                <div className="mt-2 text-right">
                                  <span className="text-gray-400 text-sm">Total: </span>
                                  <span className="text-green-400 font-bold">
                                    ${record.data.charges.reduce((sum, c) => sum + (parseFloat(c.bondAmount) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                  </span>
                                </div>
                              </div>
                            )}

                            {record.data.warrantNotes && (
                              <p className="text-gray-300 text-sm mt-2 italic">{record.data.warrantNotes}</p>
                            )}
                          </div>
                        )}

                        {/* Probation fields */}
                        {record.type === 'PROBATION' && (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {record.data.probationActive && (
                                <span className="px-2 py-0.5 bg-orange-600 text-white rounded text-xs font-bold">ACTIVE PROBATION</span>
                              )}
                              {record.data.probationJurisdiction && (
                                <span className="px-2 py-0.5 bg-gray-600 text-white rounded text-xs">Jurisdiction: {record.data.probationJurisdiction}</span>
                              )}
                            </div>

                            {/* Date Range */}
                            {(record.data.probationStartDate || record.data.probationEndDate) && (
                              <div className="text-sm">
                                <span className="text-gray-400">Period: </span>
                                <span className="text-white">
                                  {record.data.probationStartDate || 'N/A'} to {record.data.probationEndDate || 'N/A'}
                                </span>
                              </div>
                            )}

                            {/* Charges List */}
                            {record.data.probationCharges && record.data.probationCharges.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-600">
                                <p className="text-orange-400 text-xs font-semibold mb-2">CHARGES ({record.data.probationCharges.length})</p>
                                <div className="space-y-1">
                                  {record.data.probationCharges.map((charge, idx) => (
                                    <div key={idx} className="bg-gray-600 rounded px-2 py-1 text-xs">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className={`px-1.5 py-0.5 rounded text-xs mr-2 ${
                                            charge.chargeType === 'FELONY' ? 'bg-red-600' :
                                            charge.chargeType === 'MISDEMEANOR' ? 'bg-orange-600' :
                                            'bg-yellow-600'
                                          } text-white`}>
                                            {charge.chargeType}
                                          </span>
                                          <span className="text-white font-semibold">{charge.charge}</span>
                                          {charge.counts > 1 && <span className="text-gray-400 ml-1">(x{charge.counts})</span>}
                                          {charge.titleCode && <span className="text-gray-400 ml-2">[{charge.titleCode}]</span>}
                                        </div>
                                        <div className="text-right">
                                          {charge.bondAmount > 0 && (
                                            <span className="text-green-400">${parseFloat(charge.bondAmount).toLocaleString()}</span>
                                          )}
                                          {charge.jailTime && (
                                            <span className="text-gray-400 ml-2">{charge.jailTime}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {/* Fine Total */}
                                <div className="mt-2 text-right">
                                  <span className="text-gray-400 text-sm">Total: </span>
                                  <span className="text-green-400 font-bold">
                                    ${record.data.probationCharges.reduce((sum, c) => sum + (parseFloat(c.bondAmount) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                  </span>
                                </div>
                              </div>
                            )}

                            {record.data.probationNotes && (
                              <p className="text-gray-300 text-sm mt-2 italic">{record.data.probationNotes}</p>
                            )}
                          </div>
                        )}

                        {/* Parole fields */}
                        {record.type === 'PAROLE' && (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {record.data.paroleActive && (
                                <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-xs font-bold">ACTIVE PAROLE</span>
                              )}
                              {record.data.paroleJurisdiction && (
                                <span className="px-2 py-0.5 bg-gray-600 text-white rounded text-xs">Jurisdiction: {record.data.paroleJurisdiction}</span>
                              )}
                            </div>

                            {/* Date Range */}
                            {(record.data.paroleStartDate || record.data.paroleEndDate) && (
                              <div className="text-sm">
                                <span className="text-gray-400">Period: </span>
                                <span className="text-white">
                                  {record.data.paroleStartDate || 'N/A'} to {record.data.paroleEndDate || 'N/A'}
                                </span>
                              </div>
                            )}

                            {/* Charges List */}
                            {record.data.paroleCharges && record.data.paroleCharges.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-600">
                                <p className="text-purple-400 text-xs font-semibold mb-2">CHARGES ({record.data.paroleCharges.length})</p>
                                <div className="space-y-1">
                                  {record.data.paroleCharges.map((charge, idx) => (
                                    <div key={idx} className="bg-gray-600 rounded px-2 py-1 text-xs">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className={`px-1.5 py-0.5 rounded text-xs mr-2 ${
                                            charge.chargeType === 'FELONY' ? 'bg-red-600' :
                                            charge.chargeType === 'MISDEMEANOR' ? 'bg-orange-600' :
                                            'bg-yellow-600'
                                          } text-white`}>
                                            {charge.chargeType}
                                          </span>
                                          <span className="text-white font-semibold">{charge.charge}</span>
                                          {charge.counts > 1 && <span className="text-gray-400 ml-1">(x{charge.counts})</span>}
                                          {charge.titleCode && <span className="text-gray-400 ml-2">[{charge.titleCode}]</span>}
                                        </div>
                                        <div className="text-right">
                                          {charge.bondAmount > 0 && (
                                            <span className="text-green-400">${parseFloat(charge.bondAmount).toLocaleString()}</span>
                                          )}
                                          {charge.jailTime && (
                                            <span className="text-gray-400 ml-2">{charge.jailTime}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {/* Fine Total */}
                                <div className="mt-2 text-right">
                                  <span className="text-gray-400 text-sm">Total: </span>
                                  <span className="text-green-400 font-bold">
                                    ${record.data.paroleCharges.reduce((sum, c) => sum + (parseFloat(c.bondAmount) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                  </span>
                                </div>
                              </div>
                            )}

                            {record.data.paroleNotes && (
                              <p className="text-gray-300 text-sm mt-2 italic">{record.data.paroleNotes}</p>
                            )}
                          </div>
                        )}

                        {/* Medical Hazard fields */}
                        {record.type === 'MEDICAL HAZARD' && (
                          <div className="mt-2 space-y-2">
                            {record.data.universalPrecautionsFlag && (
                              <div className="bg-orange-900 border border-orange-600 rounded px-3 py-2">
                                <span className="text-orange-400 font-bold text-sm">⚠️ UNIVERSAL PRECAUTIONS REQUIRED</span>
                              </div>
                            )}
                            {record.data.medicalHazardNotes && (
                              <p className="text-gray-300 text-sm mt-2 italic">{record.data.medicalHazardNotes}</p>
                            )}
                          </div>
                        )}

                        {/* General expiration for non-LICENSE records */}
                        {record.type !== 'LICENSE' && record.type !== 'MEDICAL HISTORY' && record.type !== 'OUT OF STATE WARRANT' && record.type !== 'PROBATION' && record.type !== 'PAROLE' && record.type !== 'MEDICAL HAZARD' && record.data.expirationDate && (
                          <p className="text-gray-400 mt-1">Expires: {record.data.expirationDate}</p>
                        )}

                        {record.data.notes && (
                          <p className="text-gray-300 mt-2 italic">{record.data.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteDMVRecord(record.id)}
                        className="text-red-400 hover:text-red-300 ml-2"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>No DMV records on file</p>
              </div>
            )}
          </div>

          {/* Records/Reports Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Records & Reports</h3>
            {char.records && char.records.length > 0 ? (
              <div className="space-y-3">
                {char.records.map((record, idx) => (
                  <div key={idx} className="bg-gray-700 rounded-lg p-4">
                    <p className="text-white">{record.description}</p>
                    <p className="text-gray-400 text-sm mt-1">{formatPSTDateTime(record.timestamp)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>No records or reports on file</p>
              </div>
            )}
          </div>
        </div>
      );
    };

    // DMV Record Modal
    const renderDMVModal = () => (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className={`bg-gray-800 rounded-lg p-6 w-full ${selectedDMVType === 'VEHICLE REGISTRATION' || selectedDMVType === 'MEDICAL HISTORY' || selectedDMVType === 'REGISTERED FIREARM' || selectedDMVType === 'OUT OF STATE WARRANT' || selectedDMVType === 'PROBATION' || selectedDMVType === 'PAROLE' ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Add {selectedDMVType}</h3>
            <button onClick={() => setShowDMVModal(false)} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {(selectedDMVType === 'VEHICLE REGISTRATION') && (
              <>
                {/* Registration Information Section */}
                <div className="border-b border-gray-600 pb-4">
                  <h4 className="text-sm font-semibold text-green-400 mb-3">REGISTRATION INFORMATION</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Registration Status</label>
                      <select
                        value={dmvRecordData.registrationStatus || 'VALID'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, registrationStatus: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="VALID">VALID</option>
                        <option value="EXPIRED">EXPIRED</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="TAGS STOLEN">TAGS STOLEN</option>
                        <option value="NON-OPERATIONAL">NON-OPERATIONAL</option>
                        <option value="EXEMPT">EXEMPT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Registration Expiration</label>
                      <input
                        type="date"
                        value={dmvRecordData.registrationExpiration || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, registrationExpiration: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Insurance Status</label>
                      <select
                        value={dmvRecordData.insuranceStatus || 'VALID'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, insuranceStatus: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="VALID">VALID</option>
                        <option value="EXPIRED">EXPIRED</option>
                        <option value="NONE ON FILE">NONE ON FILE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Insurance Expiration</label>
                      <input
                        type="date"
                        value={dmvRecordData.insuranceExpiration || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, insuranceExpiration: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Information Section */}
                <div>
                  <h4 className="text-sm font-semibold text-green-400 mb-3">VEHICLE INFORMATION</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Vehicle Type</label>
                      <select
                        value={dmvRecordData.vehicleType || 'SEDAN'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, vehicleType: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="SEDAN">SEDAN</option>
                        <option value="COUPE">COUPE</option>
                        <option value="SUV">SUV</option>
                        <option value="TRUCK">TRUCK</option>
                        <option value="OFFROAD">OFFROAD</option>
                        <option value="MARINE">MARINE</option>
                        <option value="MOTORCYCLE">MOTORCYCLE</option>
                        <option value="AIRCRAFT">AIRCRAFT</option>
                        <option value="VAN">VAN</option>
                        <option value="COMPACT">COMPACT</option>
                        <option value="COMMERCIAL">COMMERCIAL</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">License Plate</label>
                      <input
                        type="text"
                        value={dmvRecordData.plateNumber || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, plateNumber: e.target.value.toUpperCase()})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-300 mb-1">VIN</label>
                      <input
                        type="text"
                        value={dmvRecordData.vin || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, vin: e.target.value.toUpperCase()})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        maxLength={17}
                        placeholder="17-character VIN"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Make</label>
                      <input
                        type="text"
                        value={dmvRecordData.make || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, make: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        placeholder="e.g., Toyota, Ford"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Model</label>
                      <input
                        type="text"
                        value={dmvRecordData.model || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, model: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        placeholder="e.g., Camry, F-150"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Color</label>
                      <input
                        type="text"
                        value={dmvRecordData.color || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, color: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        placeholder="e.g., Black, White"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Year</label>
                      <input
                        type="text"
                        value={dmvRecordData.year || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, year: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        maxLength={4}
                        placeholder="e.g., 2024"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedDMVType === 'LICENSE' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Status</label>
                    <select
                      value={dmvRecordData.status || 'VALID'}
                      onChange={(e) => setDmvRecordData({...dmvRecordData, status: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="VALID">VALID</option>
                      <option value="EXPIRED">EXPIRED</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">License Type</label>
                    <select
                      value={dmvRecordData.licenseType || 'DRIVER LICENSE'}
                      onChange={(e) => setDmvRecordData({...dmvRecordData, licenseType: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    >
                      <option value="DRIVER LICENSE">DRIVER LICENSE</option>
                      <option value="PILOT LICENSE">PILOT LICENSE</option>
                      <option value="BOAT LICENSE">BOAT LICENSE</option>
                      <option value="FISHING LICENSE">FISHING LICENSE</option>
                      <option value="HUNTING LICENSE">HUNTING LICENSE</option>
                      <option value="MEDICAL MARIJUANA">MEDICAL MARIJUANA</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Class</label>
                    <select
                      value={dmvRecordData.licenseClass || 'C'}
                      onChange={(e) => setDmvRecordData({...dmvRecordData, licenseClass: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    >
                      <option value="A">Class A</option>
                      <option value="B">Class B</option>
                      <option value="C">Class C</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Motorcycle Endorsement</label>
                    <select
                      value={dmvRecordData.motorcycleEndorsement || 'NONE'}
                      onChange={(e) => setDmvRecordData({...dmvRecordData, motorcycleEndorsement: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    >
                      <option value="NONE">None</option>
                      <option value="M1">M1</option>
                      <option value="M2">M2</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={dmvRecordData.expirationDate || ''}
                    onChange={(e) => setDmvRecordData({...dmvRecordData, expirationDate: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">License Restrictions</label>
                  <input
                    type="text"
                    value={dmvRecordData.restrictions || ''}
                    onChange={(e) => setDmvRecordData({...dmvRecordData, restrictions: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    placeholder="e.g., Corrective lenses required"
                  />
                </div>
              </>
            )}

            {selectedDMVType === 'SECURITY GUARD LICENSE' && (
              <>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">License Number</label>
                  <input
                    type="text"
                    value={dmvRecordData.licenseNumber || ''}
                    onChange={(e) => setDmvRecordData({...dmvRecordData, licenseNumber: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={dmvRecordData.expirationDate || ''}
                    onChange={(e) => setDmvRecordData({...dmvRecordData, expirationDate: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2"
                  />
                </div>
              </>
            )}

            {selectedDMVType === 'REGISTERED FIREARM' && (
              <>
                {/* Firearm Information Section */}
                <div className="border-b border-gray-600 pb-4">
                  <h4 className="text-sm font-semibold text-green-400 mb-3">FIREARM INFORMATION</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Type of Weapon</label>
                      <select
                        value={dmvRecordData.weaponType || 'HANDGUN'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, weaponType: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="HANDGUN">HANDGUN</option>
                        <option value="ASSAULT RIFLE">ASSAULT RIFLE</option>
                        <option value="SHOTGUN">SHOTGUN</option>
                        <option value="SUB/LIGHT MACHINE GUN">SUB/LIGHT MACHINE GUN</option>
                        <option value="HEAVY WEAPON">HEAVY WEAPON</option>
                        <option value="SNIPER RIFLE">SNIPER RIFLE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Name of Weapon</label>
                      <input
                        type="text"
                        value={dmvRecordData.weaponName || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, weaponName: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        placeholder="e.g., Glock 19, AR-15"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={dmvRecordData.serialNumber || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, serialNumber: e.target.value.toUpperCase()})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Where Was Weapon Purchased/Acquired</label>
                      <input
                        type="text"
                        value={dmvRecordData.purchaseLocation || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, purchaseLocation: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        placeholder="Store name, location, etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Acknowledgments Section */}
                <div className="border-b border-gray-600 pb-4">
                  <h4 className="text-sm font-semibold text-green-400 mb-3">ACKNOWLEDGMENTS</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">I Understand I Cannot Carry This Firearm On My Person Concealed or Within Reach Concealed In Vehicle Without A Valid Conceal Carry Permit</label>
                      <select
                        value={dmvRecordData.ackConcealed || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, ackConcealed: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="">Select...</option>
                        <option value="YES I UNDERSTAND">YES I UNDERSTAND</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">I Understand This Firearm Is For Myself Only And Shall Not Be Given To Any Other Subject</label>
                      <select
                        value={dmvRecordData.ackPersonalOnly || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, ackPersonalOnly: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="">Select...</option>
                        <option value="YES I UNDERSTAND">YES I UNDERSTAND</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">I Have Not Been Arrested For Any Felony Crimes And Understand That If Arrested For A Felony I No Longer Can Have My Firearm</label>
                      <select
                        value={dmvRecordData.ackFelony || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, ackFelony: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="">Select...</option>
                        <option value="YES I UNDERSTAND">YES I UNDERSTAND</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Conceal Carry Information Section - Admin Only */}
                {permissions.canAccessDispatch && (
                  <div className="border-b border-gray-600 pb-4">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-3">CONCEAL CARRY INFORMATION (Admin Only)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Conceal Permit Status</label>
                        <select
                          value={dmvRecordData.concealPermitStatus || 'NONE'}
                          onChange={(e) => setDmvRecordData({...dmvRecordData, concealPermitStatus: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        >
                          <option value="NONE">NONE</option>
                          <option value="PENDING">PENDING</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="DENIED">DENIED</option>
                          <option value="REVOKED">REVOKED</option>
                          <option value="EXPIRED">EXPIRED</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Authorizing Official Name</label>
                        <input
                          type="text"
                          value={dmvRecordData.authorizingOfficialName || ''}
                          onChange={(e) => setDmvRecordData({...dmvRecordData, authorizingOfficialName: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Authorizing Official Agency</label>
                        <input
                          type="text"
                          value={dmvRecordData.authorizingAgency || ''}
                          onChange={(e) => setDmvRecordData({...dmvRecordData, authorizingAgency: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Name of Firearm Authorized</label>
                        <input
                          type="text"
                          value={dmvRecordData.authorizedFirearmName || ''}
                          onChange={(e) => setDmvRecordData({...dmvRecordData, authorizedFirearmName: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-gray-300 mb-1">Serial Number of Firearm Authorized</label>
                        <input
                          type="text"
                          value={dmvRecordData.authorizedFirearmSerial || ''}
                          onChange={(e) => setDmvRecordData({...dmvRecordData, authorizedFirearmSerial: e.target.value.toUpperCase()})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Law Enforcement Use Only Section */}
                {permissions.canAccessDispatch && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-400 mb-3">LAW ENFORCEMENT USE ONLY</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Firearm Seized</label>
                        <select
                          value={dmvRecordData.firearmSeized || 'NO'}
                          onChange={(e) => setDmvRecordData({...dmvRecordData, firearmSeized: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        >
                          <option value="NO">NO</option>
                          <option value="YES">YES</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Evidence Locker Number</label>
                        <input
                          type="text"
                          value={dmvRecordData.evidenceLockerNumber || ''}
                          onChange={(e) => setDmvRecordData({...dmvRecordData, evidenceLockerNumber: e.target.value.toUpperCase()})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                          placeholder="Enter if seized"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedDMVType === 'MEDICAL HISTORY' && (
              <>
                {/* Patient Medical History Section */}
                <div className="border-b border-gray-600 pb-4">
                  <h4 className="text-sm font-semibold text-green-400 mb-3">PATIENT MEDICAL HISTORY</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">High Blood Pressure</label>
                      <select
                        value={dmvRecordData.highBloodPressure || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, highBloodPressure: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Heart Attack History</label>
                      <select
                        value={dmvRecordData.heartAttackHistory || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, heartAttackHistory: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">High Cholesterol</label>
                      <select
                        value={dmvRecordData.highCholesterol || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, highCholesterol: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Stroke History</label>
                      <select
                        value={dmvRecordData.strokeHistory || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, strokeHistory: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Cancer History</label>
                      <select
                        value={dmvRecordData.cancerHistory || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, cancerHistory: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Diabetes</label>
                      <select
                        value={dmvRecordData.diabetes || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, diabetes: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm text-gray-300 mb-1">Medical History Not Listed Above</label>
                    <textarea
                      value={dmvRecordData.otherMedicalHistory || ''}
                      onChange={(e) => setDmvRecordData({...dmvRecordData, otherMedicalHistory: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 h-20"
                      placeholder="Enter any additional medical history..."
                    />
                  </div>
                </div>

                {/* Medication/Item Usage Section */}
                <div className="border-b border-gray-600 pb-4">
                  <h4 className="text-sm font-semibold text-green-400 mb-3">MEDICATION / ITEM USAGE</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Blood Thinner Medication</label>
                      <select
                        value={dmvRecordData.bloodThinner || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, bloodThinner: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Anti-Depressant Medication</label>
                      <select
                        value={dmvRecordData.antiDepressant || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, antiDepressant: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Recreational Drug Usage</label>
                      <select
                        value={dmvRecordData.recreationalDrugs || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, recreationalDrugs: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Alcohol Usage</label>
                      <select
                        value={dmvRecordData.alcoholUsage || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, alcoholUsage: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Tobacco Usage</label>
                      <select
                        value={dmvRecordData.tobaccoUsage || 'NO'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, tobaccoUsage: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Packs of Smoke Per Day</label>
                      <select
                        value={dmvRecordData.packsPerDay || 'NONE'}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, packsPerDay: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="NONE">NONE</option>
                        <option value="LESS THAN 1/2">LESS THAN 1/2</option>
                        <option value="1/2">1/2</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm text-gray-300 mb-1">List Any Medications Currently Taking</label>
                    <textarea
                      value={dmvRecordData.currentMedications || ''}
                      onChange={(e) => setDmvRecordData({...dmvRecordData, currentMedications: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 h-20"
                      placeholder="List all current medications..."
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm text-gray-300 mb-1">List Any Allergies To Medications</label>
                    <textarea
                      value={dmvRecordData.medicationAllergies || ''}
                      onChange={(e) => setDmvRecordData({...dmvRecordData, medicationAllergies: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 h-20"
                      placeholder="List all medication allergies..."
                    />
                  </div>
                </div>

                {/* Date Updated */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Date Updated</label>
                  <input
                    type="date"
                    value={dmvRecordData.dateUpdated || ''}
                    onChange={(e) => setDmvRecordData({...dmvRecordData, dateUpdated: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2"
                  />
                </div>
              </>
            )}

            {selectedDMVType === 'OUT OF STATE WARRANT' && (
              <>
                {/* Warrant Information Section */}
                <div className="border-b border-gray-600 pb-4">
                  <h4 className="text-sm font-semibold text-red-400 mb-3">WARRANT INFORMATION</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-300">Warrant Status:</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dmvRecordData.warrantActive || false}
                          onChange={(e) => setDmvRecordData({...dmvRecordData, warrantActive: e.target.checked})}
                          className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500"
                        />
                        <span className={`text-sm font-semibold ${dmvRecordData.warrantActive ? 'text-red-400' : 'text-gray-400'}`}>
                          {dmvRecordData.warrantActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Warrant Out Of:</label>
                      <input
                        type="text"
                        value={dmvRecordData.warrantOutOf || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, warrantOutOf: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        placeholder="State/Location"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-300 mb-1">Extraditable Warrant?</label>
                      <select
                        value={dmvRecordData.extraditable || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, extraditable: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      >
                        <option value="">Select...</option>
                        <option value="YES">YES - SUBJECT IS TO BE PLACED IN CUSTODY AND AWAIT TRANSPORT BACK TO WARRANT LOCATION</option>
                        <option value="NO">NO - SUBJECT IS TO BE ARRESTED IN ANY LOCATION EXCEPT WARRANT LOCATION</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Out Of State Charges Section */}
                <div className="border-b border-gray-600 pb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-red-400">OUT OF STATE CHARGES</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newCharge = {
                          id: Date.now(),
                          charge: '',
                          chargeType: 'MISDEMEANOR',
                          counts: 1,
                          titleCode: '',
                          bondType: 'CASH',
                          bondAmount: 0,
                          jailTime: ''
                        };
                        setDmvRecordData({
                          ...dmvRecordData,
                          charges: [...(dmvRecordData.charges || []), newCharge]
                        });
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500 flex items-center gap-1"
                    >
                      <Plus size={16} /> Add Charge
                    </button>
                  </div>

                  {(!dmvRecordData.charges || dmvRecordData.charges.length === 0) ? (
                    <p className="text-gray-500 text-center py-4">No charges added. Click "Add Charge" to add charges.</p>
                  ) : (
                    <div className="space-y-3">
                      {dmvRecordData.charges.map((charge, index) => (
                        <div key={charge.id} className="bg-gray-700 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-gray-400">Charge #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setDmvRecordData({
                                  ...dmvRecordData,
                                  charges: dmvRecordData.charges.filter(c => c.id !== charge.id)
                                });
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-400 mb-1">Charge</label>
                              <input
                                type="text"
                                value={charge.charge}
                                onChange={(e) => {
                                  const updated = dmvRecordData.charges.map(c =>
                                    c.id === charge.id ? {...c, charge: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, charges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                                placeholder="e.g., Assault"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Charge Type</label>
                              <select
                                value={charge.chargeType}
                                onChange={(e) => {
                                  const updated = dmvRecordData.charges.map(c =>
                                    c.id === charge.id ? {...c, chargeType: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, charges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              >
                                <option value="INFRACTION">INFRACTION</option>
                                <option value="MISDEMEANOR">MISDEMEANOR</option>
                                <option value="FELONY">FELONY</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Counts</label>
                              <input
                                type="number"
                                min="1"
                                value={charge.counts}
                                onChange={(e) => {
                                  const updated = dmvRecordData.charges.map(c =>
                                    c.id === charge.id ? {...c, counts: parseInt(e.target.value) || 1} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, charges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Title/Code</label>
                              <input
                                type="text"
                                value={charge.titleCode}
                                onChange={(e) => {
                                  const updated = dmvRecordData.charges.map(c =>
                                    c.id === charge.id ? {...c, titleCode: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, charges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                                placeholder="e.g., PC 245"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Bond Type</label>
                              <select
                                value={charge.bondType}
                                onChange={(e) => {
                                  const updated = dmvRecordData.charges.map(c =>
                                    c.id === charge.id ? {...c, bondType: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, charges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              >
                                <option value="CASH">CASH</option>
                                <option value="SURETY">SURETY</option>
                                <option value="NO BAIL">NO BAIL</option>
                                <option value="OR">O.R.</option>
                                <option value="CITATION">CITATION</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Bond/Fine ($)</label>
                              <input
                                type="number"
                                min="0"
                                value={charge.bondAmount}
                                onChange={(e) => {
                                  const updated = dmvRecordData.charges.map(c =>
                                    c.id === charge.id ? {...c, bondAmount: parseFloat(e.target.value) || 0} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, charges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Jail Time</label>
                              <input
                                type="text"
                                value={charge.jailTime}
                                onChange={(e) => {
                                  const updated = dmvRecordData.charges.map(c =>
                                    c.id === charge.id ? {...c, jailTime: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, charges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                                placeholder="e.g., 30 days"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fine Total */}
                  {dmvRecordData.charges && dmvRecordData.charges.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-600 flex justify-end">
                      <div className="bg-gray-700 rounded-lg px-4 py-2">
                        <span className="text-gray-400 text-sm">Fine Total: </span>
                        <span className="text-green-400 font-bold text-lg">
                          ${dmvRecordData.charges.reduce((sum, c) => sum + (parseFloat(c.bondAmount) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={dmvRecordData.warrantNotes || ''}
                    onChange={(e) => setDmvRecordData({...dmvRecordData, warrantNotes: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
                    placeholder="Additional warrant details..."
                  />
                </div>
              </>
            )}

            {selectedDMVType === 'PROBATION' && (
              <>
                {/* Probation Information Section */}
                <div className="border-b border-gray-600 pb-4">
                  <h4 className="text-sm font-semibold text-orange-400 mb-3">PROBATION INFORMATION</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Probation Start Date</label>
                      <input
                        type="date"
                        value={dmvRecordData.probationStartDate || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, probationStartDate: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Probation End Date</label>
                      <input
                        type="date"
                        value={dmvRecordData.probationEndDate || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, probationEndDate: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-300">Probation Status:</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dmvRecordData.probationActive || false}
                          onChange={(e) => setDmvRecordData({...dmvRecordData, probationActive: e.target.checked})}
                          className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-orange-600 focus:ring-orange-500"
                        />
                        <span className={`text-sm font-semibold ${dmvRecordData.probationActive ? 'text-orange-400' : 'text-gray-400'}`}>
                          {dmvRecordData.probationActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Probation Jurisdiction:</label>
                      <input
                        type="text"
                        value={dmvRecordData.probationJurisdiction || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, probationJurisdiction: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        placeholder="County/State"
                      />
                    </div>
                  </div>
                </div>

                {/* Probation Charges Section */}
                <div className="border-b border-gray-600 pb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-orange-400">PROBATION CHARGES</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newCharge = {
                          id: Date.now(),
                          charge: '',
                          chargeType: 'MISDEMEANOR',
                          counts: 1,
                          titleCode: '',
                          bondType: 'CASH',
                          bondAmount: 0,
                          jailTime: ''
                        };
                        setDmvRecordData({
                          ...dmvRecordData,
                          probationCharges: [...(dmvRecordData.probationCharges || []), newCharge]
                        });
                      }}
                      className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-500 flex items-center gap-1"
                    >
                      <Plus size={16} /> Add Charge
                    </button>
                  </div>

                  {(!dmvRecordData.probationCharges || dmvRecordData.probationCharges.length === 0) ? (
                    <p className="text-gray-500 text-center py-4">No charges added. Click "Add Charge" to add charges.</p>
                  ) : (
                    <div className="space-y-3">
                      {dmvRecordData.probationCharges.map((charge, index) => (
                        <div key={charge.id} className="bg-gray-700 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-gray-400">Charge #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setDmvRecordData({
                                  ...dmvRecordData,
                                  probationCharges: dmvRecordData.probationCharges.filter(c => c.id !== charge.id)
                                });
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-400 mb-1">Charge</label>
                              <input
                                type="text"
                                value={charge.charge}
                                onChange={(e) => {
                                  const updated = dmvRecordData.probationCharges.map(c =>
                                    c.id === charge.id ? {...c, charge: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, probationCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                                placeholder="e.g., DUI"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Charge Type</label>
                              <select
                                value={charge.chargeType}
                                onChange={(e) => {
                                  const updated = dmvRecordData.probationCharges.map(c =>
                                    c.id === charge.id ? {...c, chargeType: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, probationCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              >
                                <option value="INFRACTION">INFRACTION</option>
                                <option value="MISDEMEANOR">MISDEMEANOR</option>
                                <option value="FELONY">FELONY</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Counts</label>
                              <input
                                type="number"
                                min="1"
                                value={charge.counts}
                                onChange={(e) => {
                                  const updated = dmvRecordData.probationCharges.map(c =>
                                    c.id === charge.id ? {...c, counts: parseInt(e.target.value) || 1} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, probationCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Title/Code</label>
                              <input
                                type="text"
                                value={charge.titleCode}
                                onChange={(e) => {
                                  const updated = dmvRecordData.probationCharges.map(c =>
                                    c.id === charge.id ? {...c, titleCode: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, probationCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                                placeholder="e.g., VC 23152"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Bond Type</label>
                              <select
                                value={charge.bondType}
                                onChange={(e) => {
                                  const updated = dmvRecordData.probationCharges.map(c =>
                                    c.id === charge.id ? {...c, bondType: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, probationCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              >
                                <option value="CASH">CASH</option>
                                <option value="SURETY">SURETY</option>
                                <option value="NO BAIL">NO BAIL</option>
                                <option value="OR">O.R.</option>
                                <option value="CITATION">CITATION</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Bond/Fine ($)</label>
                              <input
                                type="number"
                                min="0"
                                value={charge.bondAmount}
                                onChange={(e) => {
                                  const updated = dmvRecordData.probationCharges.map(c =>
                                    c.id === charge.id ? {...c, bondAmount: parseFloat(e.target.value) || 0} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, probationCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Jail Time</label>
                              <input
                                type="text"
                                value={charge.jailTime}
                                onChange={(e) => {
                                  const updated = dmvRecordData.probationCharges.map(c =>
                                    c.id === charge.id ? {...c, jailTime: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, probationCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                                placeholder="e.g., 90 days"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fine Total */}
                  {dmvRecordData.probationCharges && dmvRecordData.probationCharges.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-600 flex justify-end">
                      <div className="bg-gray-700 rounded-lg px-4 py-2">
                        <span className="text-gray-400 text-sm">Fine Total: </span>
                        <span className="text-green-400 font-bold text-lg">
                          ${dmvRecordData.probationCharges.reduce((sum, c) => sum + (parseFloat(c.bondAmount) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={dmvRecordData.probationNotes || ''}
                    onChange={(e) => setDmvRecordData({...dmvRecordData, probationNotes: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
                    placeholder="Additional probation details, conditions, etc..."
                  />
                </div>
              </>
            )}

            {selectedDMVType === 'PAROLE' && (
              <>
                {/* Parole Information Section */}
                <div className="border-b border-gray-600 pb-4">
                  <h4 className="text-sm font-semibold text-purple-400 mb-3">PAROLE INFORMATION</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Parole Start Date</label>
                      <input
                        type="date"
                        value={dmvRecordData.paroleStartDate || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, paroleStartDate: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Parole End Date</label>
                      <input
                        type="date"
                        value={dmvRecordData.paroleEndDate || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, paroleEndDate: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-300">Parole Status:</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dmvRecordData.paroleActive || false}
                          onChange={(e) => setDmvRecordData({...dmvRecordData, paroleActive: e.target.checked})}
                          className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500"
                        />
                        <span className={`text-sm font-semibold ${dmvRecordData.paroleActive ? 'text-purple-400' : 'text-gray-400'}`}>
                          {dmvRecordData.paroleActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Parole Jurisdiction:</label>
                      <input
                        type="text"
                        value={dmvRecordData.paroleJurisdiction || ''}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, paroleJurisdiction: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        placeholder="County/State"
                      />
                    </div>
                  </div>
                </div>

                {/* Parole Charges Section */}
                <div className="border-b border-gray-600 pb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-purple-400">PAROLE CHARGES</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newCharge = {
                          id: Date.now(),
                          charge: '',
                          chargeType: 'FELONY',
                          counts: 1,
                          titleCode: '',
                          bondType: 'NO BAIL',
                          bondAmount: 0,
                          jailTime: ''
                        };
                        setDmvRecordData({
                          ...dmvRecordData,
                          paroleCharges: [...(dmvRecordData.paroleCharges || []), newCharge]
                        });
                      }}
                      className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-500 flex items-center gap-1"
                    >
                      <Plus size={16} /> Add Charge
                    </button>
                  </div>

                  {(!dmvRecordData.paroleCharges || dmvRecordData.paroleCharges.length === 0) ? (
                    <p className="text-gray-500 text-center py-4">No charges added. Click "Add Charge" to add charges.</p>
                  ) : (
                    <div className="space-y-3">
                      {dmvRecordData.paroleCharges.map((charge, index) => (
                        <div key={charge.id} className="bg-gray-700 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-gray-400">Charge #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setDmvRecordData({
                                  ...dmvRecordData,
                                  paroleCharges: dmvRecordData.paroleCharges.filter(c => c.id !== charge.id)
                                });
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-400 mb-1">Charge</label>
                              <input
                                type="text"
                                value={charge.charge}
                                onChange={(e) => {
                                  const updated = dmvRecordData.paroleCharges.map(c =>
                                    c.id === charge.id ? {...c, charge: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, paroleCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                                placeholder="e.g., Armed Robbery"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Charge Type</label>
                              <select
                                value={charge.chargeType}
                                onChange={(e) => {
                                  const updated = dmvRecordData.paroleCharges.map(c =>
                                    c.id === charge.id ? {...c, chargeType: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, paroleCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              >
                                <option value="INFRACTION">INFRACTION</option>
                                <option value="MISDEMEANOR">MISDEMEANOR</option>
                                <option value="FELONY">FELONY</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Counts</label>
                              <input
                                type="number"
                                min="1"
                                value={charge.counts}
                                onChange={(e) => {
                                  const updated = dmvRecordData.paroleCharges.map(c =>
                                    c.id === charge.id ? {...c, counts: parseInt(e.target.value) || 1} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, paroleCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Title/Code</label>
                              <input
                                type="text"
                                value={charge.titleCode}
                                onChange={(e) => {
                                  const updated = dmvRecordData.paroleCharges.map(c =>
                                    c.id === charge.id ? {...c, titleCode: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, paroleCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                                placeholder="e.g., PC 211"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Bond Type</label>
                              <select
                                value={charge.bondType}
                                onChange={(e) => {
                                  const updated = dmvRecordData.paroleCharges.map(c =>
                                    c.id === charge.id ? {...c, bondType: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, paroleCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              >
                                <option value="CASH">CASH</option>
                                <option value="SURETY">SURETY</option>
                                <option value="NO BAIL">NO BAIL</option>
                                <option value="OR">O.R.</option>
                                <option value="CITATION">CITATION</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Bond/Fine ($)</label>
                              <input
                                type="number"
                                min="0"
                                value={charge.bondAmount}
                                onChange={(e) => {
                                  const updated = dmvRecordData.paroleCharges.map(c =>
                                    c.id === charge.id ? {...c, bondAmount: parseFloat(e.target.value) || 0} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, paroleCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Jail Time</label>
                              <input
                                type="text"
                                value={charge.jailTime}
                                onChange={(e) => {
                                  const updated = dmvRecordData.paroleCharges.map(c =>
                                    c.id === charge.id ? {...c, jailTime: e.target.value} : c
                                  );
                                  setDmvRecordData({...dmvRecordData, paroleCharges: updated});
                                }}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                                placeholder="e.g., 5 years"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fine Total */}
                  {dmvRecordData.paroleCharges && dmvRecordData.paroleCharges.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-600 flex justify-end">
                      <div className="bg-gray-700 rounded-lg px-4 py-2">
                        <span className="text-gray-400 text-sm">Fine Total: </span>
                        <span className="text-green-400 font-bold text-lg">
                          ${dmvRecordData.paroleCharges.reduce((sum, c) => sum + (parseFloat(c.bondAmount) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={dmvRecordData.paroleNotes || ''}
                    onChange={(e) => setDmvRecordData({...dmvRecordData, paroleNotes: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
                    placeholder="Additional parole details, conditions, parole officer info, etc..."
                  />
                </div>
              </>
            )}

            {selectedDMVType === 'MEDICAL HAZARD' && (
              <>
                {/* Universal Precautions Header */}
                <div className="bg-orange-900 border border-orange-600 rounded-lg p-4 mb-4">
                  <h4 className="text-orange-400 font-bold text-center mb-2">UNIVERSAL PRECAUTIONS (UP)</h4>
                  <p className="text-orange-200 text-sm text-center">
                    ORIGINALLY RECOMMENDED BY THE CDC IN THE 1980S, WAS INTRODUCED AS AN APPROACH TO INFECTION CONTROL TO PROTECT WORKERS FROM HIV, HBV, AND OTHER BLOODBORNE PATHOGENS IN HUMAN BLOOD AND CERTAIN OTHER BODY FLUIDS, REGARDLESS OF A PATIENT'S INFECTION STATUS.
                  </p>
                </div>

                {/* Universal Precautions Flag */}
                <div className="border-b border-gray-600 pb-4">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dmvRecordData.universalPrecautionsFlag || false}
                        onChange={(e) => setDmvRecordData({...dmvRecordData, universalPrecautionsFlag: e.target.checked})}
                        className="w-6 h-6 rounded bg-gray-700 border-gray-600 text-orange-600 focus:ring-orange-500"
                      />
                      <span className={`text-lg font-semibold ${dmvRecordData.universalPrecautionsFlag ? 'text-orange-400' : 'text-gray-400'}`}>
                        FLAG FOR UNIVERSAL PRECAUTIONS
                      </span>
                    </label>
                  </div>
                  {dmvRecordData.universalPrecautionsFlag && (
                    <p className="text-orange-400 text-sm mt-2 ml-9">
                      ⚠️ This individual requires Universal Precautions protocols
                    </p>
                  )}
                </div>

                {/* Notes Section */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={dmvRecordData.medicalHazardNotes || ''}
                    onChange={(e) => setDmvRecordData({...dmvRecordData, medicalHazardNotes: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
                    placeholder="Additional medical hazard details..."
                  />
                </div>
              </>
            )}

            {selectedDMVType !== 'OUT OF STATE WARRANT' && selectedDMVType !== 'PROBATION' && selectedDMVType !== 'PAROLE' && selectedDMVType !== 'MEDICAL HAZARD' && (
              <div>
                <label className="block text-sm text-gray-300 mb-1">Notes</label>
                <textarea
                  value={dmvRecordData.notes || ''}
                  onChange={(e) => setDmvRecordData({...dmvRecordData, notes: e.target.value})}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
                  placeholder="Additional details..."
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <button
                onClick={addDMVRecord}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
              >
                Add Record
              </button>
              <button
                onClick={() => {
                  setShowDMVModal(false);
                  setDmvRecordData({});
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-gradient-to-r from-purple-900 to-purple-800 border-b-4 border-purple-500 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xl text-white">Silver Lining Roleplay</p>
              </div>
              <button
                onClick={() => setSelectedRole(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Change Role
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {civilianView === 'list' && renderCharacterList()}
            {(civilianView === 'add' || civilianView === 'edit') && renderCharacterForm()}
            {civilianView === 'detail' && renderCharacterDetail()}
          </div>
        </main>

        <footer className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-6xl mx-auto text-center text-gray-400 text-sm">
            Silver Lining Roleplay - Los Santos Sheriff Office
          </div>
        </footer>

        {showDMVModal && renderDMVModal()}
      </div>
    );
  };

  // Show loading state while checking for saved session (prevents hydration mismatch)
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated || showLogin) {
    return <PoliceLogin />;
  }

  if (!selectedRole) {
    return <RoleSelection />;
  }

  if (selectedRole === 'civilian') {
    return renderCivilianInterface();
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
                  setShowRoleMenu(false);
                  setShowRecordsMenu(true);
                }}
                className="w-full px-4 py-2 rounded text-left transition bg-green-700 text-white hover:bg-green-600"
              >
                <div className="font-semibold flex items-center gap-2">
                  <Database size={16} />
                  Records Management
                </div>
                <div className="text-xs text-gray-300">Lookup, Records, BOLO</div>
              </button>

              <button
                onClick={() => {
                  setShowRoleMenu(false);
                  handleLogout();
                }}
                className="w-full px-4 py-2 rounded text-left transition bg-orange-700 text-white hover:bg-orange-600"
              >
                <div className="font-semibold flex items-center gap-2">
                  <LogOut size={16} />
                  Sign Out
                </div>
                <div className="text-xs text-gray-300">Log out and return to login</div>
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

          <button
            onClick={() => {
              setShowRoleMenu(false);
              setSelectedRole(null);
            }}
            className="w-full px-4 py-2 rounded text-left transition bg-purple-700 text-white hover:bg-purple-600"
          >
            <div className="font-semibold flex items-center gap-2">
              <User size={16} />
              Change Role
            </div>
            <div className="text-xs text-gray-300">Return to role selection</div>
          </button>

          {selectedRole !== 'police' && (
            <button
              onClick={() => {
                setShowRoleMenu(false);
                handleLogout();
              }}
              className="w-full px-4 py-2 rounded text-left transition bg-red-700 text-white hover:bg-red-600"
            >
              <div className="font-semibold flex items-center gap-2">
                <LogOut size={16} />
                Sign Out
              </div>
              <div className="text-xs text-gray-300">Log out and return to login</div>
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

  // Records Management Menu Component
  const RecordsManagementMenu = () => {
    const togglePin = (buttonName) => {
      setPinnedRecordsButtons(prev => ({
        ...prev,
        [buttonName]: !prev[buttonName]
      }));
    };

    const handleButtonClick = (panelName) => {
      setActiveRecordsPanel(panelName);
      setShowRecordsMenu(false);
    };

    return (
      <div className="fixed bottom-20 left-4 bg-gray-800 rounded-lg shadow-lg border border-green-700 p-4 w-72 z-50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-green-400 font-bold flex items-center gap-2">
            <Database size={18} />
            Records Management
          </h3>
          <button onClick={() => setShowRecordsMenu(false)} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {/* Lookup Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleButtonClick('lookup')}
              className="flex-1 px-4 py-3 rounded text-left transition bg-blue-700 text-white hover:bg-blue-600"
            >
              <div className="font-semibold flex items-center gap-2">
                <Search size={18} />
                Lookup
              </div>
              <div className="text-xs text-gray-300">Search persons & vehicles</div>
            </button>
            <button
              onClick={() => togglePin('lookup')}
              className={`p-2 rounded transition ${pinnedRecordsButtons.lookup ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              title={pinnedRecordsButtons.lookup ? 'Unpin from toolbar' : 'Pin to toolbar'}
            >
              {pinnedRecordsButtons.lookup ? <PinOff size={18} /> : <Pin size={18} />}
            </button>
          </div>

          {/* Records Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleButtonClick('records')}
              className="flex-1 px-4 py-3 rounded text-left transition bg-purple-700 text-white hover:bg-purple-600"
            >
              <div className="font-semibold flex items-center gap-2">
                <FileText size={18} />
                Records
              </div>
              <div className="text-xs text-gray-300">View & manage records</div>
            </button>
            <button
              onClick={() => togglePin('records')}
              className={`p-2 rounded transition ${pinnedRecordsButtons.records ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              title={pinnedRecordsButtons.records ? 'Unpin from toolbar' : 'Pin to toolbar'}
            >
              {pinnedRecordsButtons.records ? <PinOff size={18} /> : <Pin size={18} />}
            </button>
          </div>

          {/* BOLO Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleButtonClick('bolo')}
              className="flex-1 px-4 py-3 rounded text-left transition bg-red-700 text-white hover:bg-red-600"
            >
              <div className="font-semibold flex items-center gap-2">
                <AlertTriangle size={18} />
                BOLO
              </div>
              <div className="text-xs text-gray-300">Be On the Lookout alerts</div>
            </button>
            <button
              onClick={() => togglePin('bolo')}
              className={`p-2 rounded transition ${pinnedRecordsButtons.bolo ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              title={pinnedRecordsButtons.bolo ? 'Unpin from toolbar' : 'Pin to toolbar'}
            >
              {pinnedRecordsButtons.bolo ? <PinOff size={18} /> : <Pin size={18} />}
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Click the pin icon to add buttons to the toolbar
          </p>
        </div>
      </div>
    );
  };

  // Records Panel JSX - Rendered inline to prevent re-render issues with form inputs
  const recordsPanelJSX = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2">
              <FileText size={24} />
              Records Management
            </h2>
            <button
              onClick={() => setActiveRecordsPanel(null)}
              className="text-gray-400 hover:text-white transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Top Button Bar */}
          <div className="bg-gray-850 px-6 py-3 border-b border-gray-700 flex gap-2 flex-wrap">
            {/* Search Button */}
            <button
              onClick={() => {/* TODO: Implement search */}}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition flex items-center gap-2"
            >
              <Search size={18} />
              Search
            </button>

            {/* New Report Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNewReportDropdown(!showNewReportDropdown);
                  setShowNewRecordDropdown(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition flex items-center gap-2"
              >
                <Plus size={18} />
                New Report
                <span className="text-xs">▼</span>
              </button>
              {showNewReportDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-1 z-10 min-w-64">
                  {REPORT_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => handleNewReport(type)}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-600 transition text-sm"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* New Record Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNewRecordDropdown(!showNewRecordDropdown);
                  setShowNewReportDropdown(false);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-500 transition flex items-center gap-2"
              >
                <Plus size={18} />
                New Record
                <span className="text-xs">▼</span>
              </button>
              {showNewRecordDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-1 z-10 min-w-48">
                  {RECORD_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => handleNewRecord(type)}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-600 transition text-sm"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Supervisor Panel Button */}
            <button
              onClick={() => {/* TODO: Implement supervisor panel */}}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition flex items-center gap-2"
            >
              <Shield size={18} />
              Supervisor Panel
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Reports Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  My Reports
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {officerReports.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">
                      <FileText size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No reports yet</p>
                      <p className="text-sm">Click "New Report" to create one</p>
                    </div>
                  ) : (
                    officerReports.map(report => (
                      <div
                        key={report.id}
                        onClick={() => openExistingReport(report)}
                        className="bg-gray-800 rounded p-3 hover:bg-gray-750 cursor-pointer transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-white font-semibold">{report.type}</div>
                            <div className="text-gray-400 text-sm">{report.id}</div>
                            {report.recordNumber && (
                              <div className="text-blue-400 text-sm">Record# {report.recordNumber}</div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            report.status === 'DRAFT' ? 'bg-yellow-600' :
                            report.status === 'SUBMITTED' ? 'bg-blue-600' :
                            report.status === 'APPROVED' ? 'bg-green-600' : 'bg-gray-600'
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        <div className="text-gray-500 text-xs mt-2">
                          Created: {formatRecordDateTime(report.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Records Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-400 mb-4 flex items-center gap-2">
                  <Database size={20} />
                  My Records
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {officerRecords.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">
                      <Database size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No records yet</p>
                      <p className="text-sm">Click "New Record" to create one</p>
                    </div>
                  ) : (
                    officerRecords.map(record => (
                      <div
                        key={record.id}
                        onClick={() => openExistingRecord(record)}
                        className="bg-gray-800 rounded p-3 hover:bg-gray-750 cursor-pointer transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-white font-semibold">{record.type}</div>
                            <div className="text-gray-400 text-sm">{record.id}</div>
                            {record.recordNumber && (
                              <div className="text-blue-400 text-sm">Record# {record.recordNumber}</div>
                            )}
                            {record.subject && (
                              <div className="text-gray-300 text-sm mt-1">Subject: {record.subject}</div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            record.status === 'ACTIVE' ? 'bg-green-600' :
                            record.status === 'PENDING' ? 'bg-yellow-600' :
                            record.status === 'CLOSED' ? 'bg-gray-600' : 'bg-blue-600'
                          }`}>
                            {record.status}
                          </span>
                        </div>
                        <div className="text-gray-500 text-xs mt-2">
                          Created: {formatRecordDateTime(record.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Form Modal */}
        {activeReportForm && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-800 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
                <h3 className="text-lg font-bold text-green-400">{activeReportForm}</h3>
                <button
                  onClick={() => {
                    setActiveReportForm(null);
                    setCurrentReportData({});
                    setEditingReportId(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Traffic Collision Report Form */}
                {activeReportForm === 'TRAFFIC COLLISION REPORT' ? (
                  <>
                    {/* Agency Information Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Agency Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Callsign</label>
                          <input
                            type="text"
                            value={currentReportData.callsign || ''}
                            readOnly
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Department</label>
                          <input
                            type="text"
                            value={currentReportData.department || ''}
                            readOnly
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Name</label>
                          <input
                            type="text"
                            value={currentReportData.officer || ''}
                            readOnly
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date</label>
                          <input
                            type="text"
                            value={currentReportData.date ? new Date(currentReportData.date).toLocaleDateString() : ''}
                            readOnly
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Record#</label>
                          <input
                            type="text"
                            value={currentReportData.recordNumber || ''}
                            readOnly
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Location</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Collision Occurred On</label>
                          <input
                            type="text"
                            value={currentReportData.collisionLocation || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, collisionLocation: e.target.value})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Postal</label>
                          <input
                            type="text"
                            value={currentReportData.postal || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, postal: e.target.value})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date of Collision</label>
                          <input
                            type="date"
                            value={currentReportData.collisionDate || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, collisionDate: e.target.value})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Time of Collision</label>
                          <input
                            type="time"
                            value={currentReportData.collisionTime || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, collisionTime: e.target.value})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Road Type</label>
                          <select
                            value={currentReportData.roadType || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, roadType: e.target.value})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="HIGHWAY">Highway</option>
                            <option value="CITY_STREET">City Street</option>
                            <option value="COUNTY_ROAD">County Road</option>
                            <option value="PRIVATE_ROAD">Private Road</option>
                            <option value="PARKING_LOT">Parking Lot</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Weather</label>
                          <select
                            value={currentReportData.weather || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, weather: e.target.value})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="CLEAR">Clear</option>
                            <option value="CLOUDY">Cloudy</option>
                            <option value="RAIN">Rain</option>
                            <option value="FOG">Fog</option>
                            <option value="SNOW">Snow</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                          <input
                            type="checkbox"
                            id="hasPhotos"
                            checked={currentReportData.hasPhotos || false}
                            onChange={(e) => setCurrentReportData({...currentReportData, hasPhotos: e.target.checked})}
                            className="w-4 h-4"
                          />
                          <label htmlFor="hasPhotos" className="text-sm text-gray-300">Photos Taken</label>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle #1 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-400 mb-3 border-b border-gray-600 pb-2">Vehicle #1 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Plate</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={vehicleSearchPlate1}
                            onChange={(e) => setVehicleSearchPlate1(e.target.value)}
                            placeholder="Enter plate number..."
                            className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => searchVehicleByPlate(vehicleSearchPlate1, 1)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm"
                          >
                            Search
                          </button>
                        </div>
                        {vehicleSearchResults1.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {vehicleSearchResults1.map((v, i) => (
                              <div
                                key={i}
                                onClick={() => selectVehicle(v, 1)}
                                className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm"
                              >
                                {v.plate} - {v.year} {v.make} {v.model} ({v.color}) - Owner: {v.ownerName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Plate</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle1?.plate || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, plate: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Year</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle1?.year || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, year: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Make</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle1?.make || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, make: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Model</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle1?.model || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, model: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Color</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle1?.color || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, color: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Damage</label>
                          <select
                            value={currentReportData.vehicle1?.damage || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, damage: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="NONE">None</option>
                            <option value="MINOR">Minor</option>
                            <option value="MODERATE">Moderate</option>
                            <option value="MAJOR">Major</option>
                            <option value="TOTALED">Totaled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Defects</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle1?.defects || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, defects: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Damage Location</label>
                          <select
                            value={currentReportData.vehicle1?.damageLocation || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, damageLocation: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="FRONT">Front</option>
                            <option value="REAR">Rear</option>
                            <option value="LEFT_SIDE">Left Side</option>
                            <option value="RIGHT_SIDE">Right Side</option>
                            <option value="MULTIPLE">Multiple Areas</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Disposition</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                              <input
                                type="radio"
                                name="vehicle1Disposition"
                                value="TOWED"
                                checked={currentReportData.vehicle1?.disposition === 'TOWED'}
                                onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, disposition: e.target.value}})}
                              />
                              Towed
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                              <input
                                type="radio"
                                name="vehicle1Disposition"
                                value="DRIVEN"
                                checked={currentReportData.vehicle1?.disposition === 'DRIVEN'}
                                onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, disposition: e.target.value}})}
                              />
                              Driven Away
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Party #1 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-400 mb-3 border-b border-gray-600 pb-2">Party #1 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Name</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={partySearchName1}
                            onChange={(e) => setPartySearchName1(e.target.value)}
                            placeholder="Enter name..."
                            className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => searchPersonByName(partySearchName1, 1)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm"
                          >
                            Search
                          </button>
                        </div>
                        {partySearchResults1.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {partySearchResults1.map((p, i) => (
                              <div
                                key={i}
                                onClick={() => selectParty(p, 1)}
                                className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm"
                              >
                                {p.firstName} {p.lastName} - DOB: {p.dob}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input
                            type="text"
                            value={currentReportData.party1?.name || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, name: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">DOB</label>
                          <input
                            type="text"
                            value={currentReportData.party1?.dob || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, dob: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input
                            type="text"
                            value={currentReportData.party1?.phone || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, phone: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Address</label>
                          <input
                            type="text"
                            value={currentReportData.party1?.address || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, address: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vehicle #2 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-400 mb-3 border-b border-gray-600 pb-2">Vehicle #2 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Plate</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={vehicleSearchPlate2}
                            onChange={(e) => setVehicleSearchPlate2(e.target.value)}
                            placeholder="Enter plate number..."
                            className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => searchVehicleByPlate(vehicleSearchPlate2, 2)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm"
                          >
                            Search
                          </button>
                        </div>
                        {vehicleSearchResults2.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {vehicleSearchResults2.map((v, i) => (
                              <div
                                key={i}
                                onClick={() => selectVehicle(v, 2)}
                                className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm"
                              >
                                {v.plate} - {v.year} {v.make} {v.model} ({v.color}) - Owner: {v.ownerName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Plate</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle2?.plate || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, plate: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Year</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle2?.year || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, year: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Make</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle2?.make || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, make: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Model</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle2?.model || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, model: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Color</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle2?.color || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, color: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Damage</label>
                          <select
                            value={currentReportData.vehicle2?.damage || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, damage: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="NONE">None</option>
                            <option value="MINOR">Minor</option>
                            <option value="MODERATE">Moderate</option>
                            <option value="MAJOR">Major</option>
                            <option value="TOTALED">Totaled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Defects</label>
                          <input
                            type="text"
                            value={currentReportData.vehicle2?.defects || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, defects: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Damage Location</label>
                          <select
                            value={currentReportData.vehicle2?.damageLocation || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, damageLocation: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="FRONT">Front</option>
                            <option value="REAR">Rear</option>
                            <option value="LEFT_SIDE">Left Side</option>
                            <option value="RIGHT_SIDE">Right Side</option>
                            <option value="MULTIPLE">Multiple Areas</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Disposition</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                              <input
                                type="radio"
                                name="vehicle2Disposition"
                                value="TOWED"
                                checked={currentReportData.vehicle2?.disposition === 'TOWED'}
                                onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, disposition: e.target.value}})}
                              />
                              Towed
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                              <input
                                type="radio"
                                name="vehicle2Disposition"
                                value="DRIVEN"
                                checked={currentReportData.vehicle2?.disposition === 'DRIVEN'}
                                onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, disposition: e.target.value}})}
                              />
                              Driven Away
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Party #2 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-400 mb-3 border-b border-gray-600 pb-2">Party #2 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Name</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={partySearchName2}
                            onChange={(e) => setPartySearchName2(e.target.value)}
                            placeholder="Enter name..."
                            className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => searchPersonByName(partySearchName2, 2)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm"
                          >
                            Search
                          </button>
                        </div>
                        {partySearchResults2.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {partySearchResults2.map((p, i) => (
                              <div
                                key={i}
                                onClick={() => selectParty(p, 2)}
                                className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm"
                              >
                                {p.firstName} {p.lastName} - DOB: {p.dob}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input
                            type="text"
                            value={currentReportData.party2?.name || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, name: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">DOB</label>
                          <input
                            type="text"
                            value={currentReportData.party2?.dob || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, dob: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input
                            type="text"
                            value={currentReportData.party2?.phone || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, phone: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Address</label>
                          <input
                            type="text"
                            value={currentReportData.party2?.address || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, address: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Traffic Collision Coding */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-red-400 mb-3 border-b border-gray-600 pb-2">Traffic Collision Coding</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Primary Fault</label>
                          <select
                            value={currentReportData.coding?.fault || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, fault: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="PARTY_1">Party #1</option>
                            <option value="PARTY_2">Party #2</option>
                            <option value="SHARED">Shared</option>
                            <option value="UNKNOWN">Unknown</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Collision Type</label>
                          <select
                            value={currentReportData.coding?.collisionType || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, collisionType: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="HEAD_ON">Head-On</option>
                            <option value="REAR_END">Rear-End</option>
                            <option value="SIDESWIPE">Sideswipe</option>
                            <option value="BROADSIDE">Broadside</option>
                            <option value="HIT_AND_RUN">Hit and Run</option>
                            <option value="ROLLOVER">Rollover</option>
                            <option value="PEDESTRIAN">Pedestrian</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Lighting</label>
                          <select
                            value={currentReportData.coding?.lighting || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, lighting: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="DAYLIGHT">Daylight</option>
                            <option value="DUSK">Dusk</option>
                            <option value="DAWN">Dawn</option>
                            <option value="DARK_LIGHTED">Dark - Street Lights</option>
                            <option value="DARK_UNLIGHTED">Dark - No Lights</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Road Surface</label>
                          <select
                            value={currentReportData.coding?.surface || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, surface: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="DRY">Dry</option>
                            <option value="WET">Wet</option>
                            <option value="ICY">Icy</option>
                            <option value="SNOW">Snow</option>
                            <option value="MUDDY">Muddy</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Traffic Controls</label>
                          <select
                            value={currentReportData.coding?.controls || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, controls: e.target.value}})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="NONE">None</option>
                            <option value="STOP_SIGN">Stop Sign</option>
                            <option value="YIELD">Yield Sign</option>
                            <option value="TRAFFIC_SIGNAL">Traffic Signal</option>
                            <option value="FLASHING_LIGHT">Flashing Light</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-gray-800 rounded p-3">
                          <h5 className="text-sm font-semibold text-yellow-400 mb-2">Party #1</h5>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Movement</label>
                              <select
                                value={currentReportData.coding?.party1Movement || ''}
                                onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, party1Movement: e.target.value}})}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-xs"
                              >
                                <option value="">Select...</option>
                                <option value="STRAIGHT">Straight</option>
                                <option value="TURNING_LEFT">Turning Left</option>
                                <option value="TURNING_RIGHT">Turning Right</option>
                                <option value="BACKING">Backing</option>
                                <option value="STOPPED">Stopped</option>
                                <option value="PARKED">Parked</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sobriety</label>
                              <select
                                value={currentReportData.coding?.party1Sobriety || ''}
                                onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, party1Sobriety: e.target.value}})}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-xs"
                              >
                                <option value="">Select...</option>
                                <option value="SOBER">Sober</option>
                                <option value="HBD">HBD (Had Been Drinking)</option>
                                <option value="IMPAIRED">Impaired</option>
                                <option value="UNDER_INFLUENCE">Under Influence</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Injuries</label>
                              <select
                                value={currentReportData.coding?.party1Injuries || ''}
                                onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, party1Injuries: e.target.value}})}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-xs"
                              >
                                <option value="">Select...</option>
                                <option value="NONE">None</option>
                                <option value="MINOR">Minor</option>
                                <option value="MODERATE">Moderate</option>
                                <option value="SEVERE">Severe</option>
                                <option value="FATAL">Fatal</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded p-3">
                          <h5 className="text-sm font-semibold text-yellow-400 mb-2">Party #2</h5>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Movement</label>
                              <select
                                value={currentReportData.coding?.party2Movement || ''}
                                onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, party2Movement: e.target.value}})}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-xs"
                              >
                                <option value="">Select...</option>
                                <option value="STRAIGHT">Straight</option>
                                <option value="TURNING_LEFT">Turning Left</option>
                                <option value="TURNING_RIGHT">Turning Right</option>
                                <option value="BACKING">Backing</option>
                                <option value="STOPPED">Stopped</option>
                                <option value="PARKED">Parked</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sobriety</label>
                              <select
                                value={currentReportData.coding?.party2Sobriety || ''}
                                onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, party2Sobriety: e.target.value}})}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-xs"
                              >
                                <option value="">Select...</option>
                                <option value="SOBER">Sober</option>
                                <option value="HBD">HBD (Had Been Drinking)</option>
                                <option value="IMPAIRED">Impaired</option>
                                <option value="UNDER_INFLUENCE">Under Influence</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Injuries</label>
                              <select
                                value={currentReportData.coding?.party2Injuries || ''}
                                onChange={(e) => setCurrentReportData({...currentReportData, coding: {...currentReportData.coding, party2Injuries: e.target.value}})}
                                className="w-full bg-gray-600 text-white rounded px-2 py-1 text-xs"
                              >
                                <option value="">Select...</option>
                                <option value="NONE">None</option>
                                <option value="MINOR">Minor</option>
                                <option value="MODERATE">Moderate</option>
                                <option value="SEVERE">Severe</option>
                                <option value="FATAL">Fatal</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Narrative Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Narrative</h4>
                      <textarea
                        value={currentReportData.narrative || ''}
                        onChange={(e) => setCurrentReportData({...currentReportData, narrative: e.target.value})}
                        className="w-full bg-gray-600 text-white rounded px-3 py-2 h-40 text-sm"
                        placeholder="Enter detailed narrative of the collision..."
                      />
                    </div>

                    {/* Scene Images Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Scene Images</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Upload Images</label>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleSceneImageUpload}
                          className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                        />
                      </div>
                      {currentReportData.sceneImages?.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {currentReportData.sceneImages.map((img: any) => (
                            <div key={img.id} className="relative bg-gray-800 rounded p-2">
                              <img src={img.data} alt={img.name} className="w-full h-24 object-cover rounded" />
                              <button
                                onClick={() => removeSceneImage(img.id)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-500"
                              >
                                <X size={12} />
                              </button>
                              <input
                                type="text"
                                placeholder="Add note..."
                                value={img.note || ''}
                                onChange={(e) => updateImageNote(img.id, e.target.value)}
                                className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Completed By Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Completed By</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Officer Name</label>
                          <input type="text" value={currentReportData.completedByOfficerName || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByOfficerName: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Badge#</label>
                          <input type="text" value={currentReportData.completedByBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Department</label>
                          <select value={currentReportData.completedByDepartment || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByDepartment: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="LSSO">LSSO</option>
                            <option value="LSSO_CONTRACT">LSSO Contract Agency</option>
                            <option value="LSSO_COMMUNITY">LSSO Community Service</option>
                            <option value="LSSO_CORRECTIONS">LSSO Corrections Department</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date</label>
                          <input type="date" value={currentReportData.completedByDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Supervisor Signature Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Supervisor Signature</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Supervisor Name</label>
                          <input
                            type="text"
                            value={currentReportData.supervisorName || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, supervisorName: e.target.value})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Supervisor Badge #</label>
                          <input
                            type="text"
                            value={currentReportData.supervisorBadge || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, supervisorBadge: e.target.value})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date Signed</label>
                          <input
                            type="date"
                            value={currentReportData.supervisorSignDate || ''}
                            onChange={(e) => setCurrentReportData({...currentReportData, supervisorSignDate: e.target.value})}
                            className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Report Status</label>
                          <select value={currentReportData.reportStatus || ''} onChange={(e) => setCurrentReportData({...currentReportData, reportStatus: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="APPROVED">Approved</option>
                            <option value="PENDING">Pending</option>
                            <option value="DENIED">Denied/Needs Edits</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Linked Reports/Records Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Linked Reports/Records</h4>
                      <button
                        onClick={addLinkedReport}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm mb-3"
                      >
                        + Add Link
                      </button>
                      {currentReportData.linkedReports?.map((link: any, index: number) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <select
                            value={link.type || ''}
                            onChange={(e) => {
                              const newLinks = [...currentReportData.linkedReports];
                              newLinks[index] = { ...newLinks[index], type: e.target.value };
                              setCurrentReportData({...currentReportData, linkedReports: newLinks});
                            }}
                            className="bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="">Type...</option>
                            <option value="ARREST">Arrest</option>
                            <option value="CITATION">Citation</option>
                            <option value="TOW">Tow Report</option>
                            <option value="SUPPLEMENTAL">Supplemental</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Report/Record #"
                            value={link.number || ''}
                            onChange={(e) => {
                              const newLinks = [...currentReportData.linkedReports];
                              newLinks[index] = { ...newLinks[index], number: e.target.value };
                              setCurrentReportData({...currentReportData, linkedReports: newLinks});
                            }}
                            className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => removeLinkedReport(index)}
                            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-500"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : activeReportForm === 'SUPPLEMENTAL REPORT' ? (
                  /* Supplemental Report Form */
                  <>
                    {/* Agency Information Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Agency Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Callsign</label>
                          <input type="text" value={currentReportData.callsign || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Department</label>
                          <input type="text" value={currentReportData.department || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Name</label>
                          <input type="text" value={currentReportData.officer || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date</label>
                          <input type="text" value={currentReportData.date ? new Date(currentReportData.date).toLocaleDateString() : ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Record#</label>
                          <input type="text" value={currentReportData.recordNumber || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Supplemental Report Reference */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-400 mb-3 border-b border-gray-600 pb-2">Supplemental Report Reference</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date of Call</label>
                          <input type="date" value={currentReportData.dateOfCall || ''} onChange={(e) => setCurrentReportData({...currentReportData, dateOfCall: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Primary Department</label>
                          <select value={currentReportData.primaryDepartment || ''} onChange={(e) => setCurrentReportData({...currentReportData, primaryDepartment: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="LSSO">LSSO</option>
                            <option value="LSSO_CONTRACT">LSSO Contract Agency</option>
                            <option value="LSSO_COMMUNITY">LSSO Community Service</option>
                            <option value="LSSO_CORRECTIONS">LSSO Corrections Department</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Primary Officer Badge #</label>
                          <input type="text" value={currentReportData.primaryOfficerBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, primaryOfficerBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Dispatch Call ID Ref#</label>
                          <input type="text" value={currentReportData.dispatchCallRef || ''} onChange={(e) => setCurrentReportData({...currentReportData, dispatchCallRef: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Arrest Report Ref#</label>
                          <input type="text" value={currentReportData.arrestReportRef || ''} onChange={(e) => setCurrentReportData({...currentReportData, arrestReportRef: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Traffic Accident Ref#</label>
                          <input type="text" value={currentReportData.trafficAccidentRef || ''} onChange={(e) => setCurrentReportData({...currentReportData, trafficAccidentRef: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Citation Ref#</label>
                          <input type="text" value={currentReportData.citationRef || ''} onChange={(e) => setCurrentReportData({...currentReportData, citationRef: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2 md:col-span-4">
                          <label className="block text-xs text-gray-400 mb-1">Additional Reference Info</label>
                          <input type="text" value={currentReportData.additionalRefInfo || ''} onChange={(e) => setCurrentReportData({...currentReportData, additionalRefInfo: e.target.value})} placeholder="Any other reference information..." className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Location Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Location</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Location/Address</label>
                          <input type="text" value={currentReportData.location || ''} onChange={(e) => setCurrentReportData({...currentReportData, location: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Postal</label>
                          <input type="text" value={currentReportData.postal || ''} onChange={(e) => setCurrentReportData({...currentReportData, postal: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date of Incident</label>
                          <input type="date" value={currentReportData.incidentDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, incidentDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Time of Incident</label>
                          <input type="time" value={currentReportData.incidentTime || ''} onChange={(e) => setCurrentReportData({...currentReportData, incidentTime: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Vehicle #1 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-400 mb-3 border-b border-gray-600 pb-2">Vehicle #1 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Plate</label>
                        <div className="flex gap-2">
                          <input type="text" value={vehicleSearchPlate1} onChange={(e) => setVehicleSearchPlate1(e.target.value)} placeholder="Enter plate number..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchVehicleByPlate(vehicleSearchPlate1, 1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {vehicleSearchResults1.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {vehicleSearchResults1.map((v, i) => (
                              <div key={i} onClick={() => selectVehicle(v, 1)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {v.plate} - {v.year} {v.make} {v.model} ({v.color}) - Owner: {v.ownerName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Plate</label>
                          <input type="text" value={currentReportData.vehicle1?.plate || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, plate: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Year</label>
                          <input type="text" value={currentReportData.vehicle1?.year || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, year: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Make</label>
                          <input type="text" value={currentReportData.vehicle1?.make || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, make: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Model</label>
                          <input type="text" value={currentReportData.vehicle1?.model || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, model: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Color</label>
                          <input type="text" value={currentReportData.vehicle1?.color || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, color: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Party #1 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-400 mb-3 border-b border-gray-600 pb-2">Party #1 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Name</label>
                        <div className="flex gap-2">
                          <input type="text" value={partySearchName1} onChange={(e) => setPartySearchName1(e.target.value)} placeholder="Enter name..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchPersonByName(partySearchName1, 1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {partySearchResults1.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {partySearchResults1.map((p, i) => (
                              <div key={i} onClick={() => selectParty(p, 1)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {p.firstName} {p.lastName} - DOB: {p.dob}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input type="text" value={currentReportData.party1?.name || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, name: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">DOB</label>
                          <input type="text" value={currentReportData.party1?.dob || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, dob: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input type="text" value={currentReportData.party1?.phone || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, phone: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Address</label>
                          <input type="text" value={currentReportData.party1?.address || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, address: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Vehicle #2 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-400 mb-3 border-b border-gray-600 pb-2">Vehicle #2 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Plate</label>
                        <div className="flex gap-2">
                          <input type="text" value={vehicleSearchPlate2} onChange={(e) => setVehicleSearchPlate2(e.target.value)} placeholder="Enter plate number..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchVehicleByPlate(vehicleSearchPlate2, 2)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {vehicleSearchResults2.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {vehicleSearchResults2.map((v, i) => (
                              <div key={i} onClick={() => selectVehicle(v, 2)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {v.plate} - {v.year} {v.make} {v.model} ({v.color}) - Owner: {v.ownerName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Plate</label>
                          <input type="text" value={currentReportData.vehicle2?.plate || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, plate: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Year</label>
                          <input type="text" value={currentReportData.vehicle2?.year || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, year: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Make</label>
                          <input type="text" value={currentReportData.vehicle2?.make || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, make: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Model</label>
                          <input type="text" value={currentReportData.vehicle2?.model || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, model: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Color</label>
                          <input type="text" value={currentReportData.vehicle2?.color || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, color: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Party #2 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-400 mb-3 border-b border-gray-600 pb-2">Party #2 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Name</label>
                        <div className="flex gap-2">
                          <input type="text" value={partySearchName2} onChange={(e) => setPartySearchName2(e.target.value)} placeholder="Enter name..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchPersonByName(partySearchName2, 2)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {partySearchResults2.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {partySearchResults2.map((p, i) => (
                              <div key={i} onClick={() => selectParty(p, 2)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {p.firstName} {p.lastName} - DOB: {p.dob}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input type="text" value={currentReportData.party2?.name || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, name: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">DOB</label>
                          <input type="text" value={currentReportData.party2?.dob || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, dob: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input type="text" value={currentReportData.party2?.phone || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, phone: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Address</label>
                          <input type="text" value={currentReportData.party2?.address || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, address: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Narrative Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Supplemental Narrative</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Reason for Supplement</label>
                        <select value={currentReportData.supplementReason || ''} onChange={(e) => setCurrentReportData({...currentReportData, supplementReason: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                          <option value="">Select...</option>
                          <option value="NEW_INFO">New Information</option>
                          <option value="FOLLOW_UP">Follow-Up Investigation</option>
                          <option value="CORRECTION">Correction to Original</option>
                          <option value="WITNESS_STATEMENT">Additional Witness Statement</option>
                          <option value="EVIDENCE">Additional Evidence</option>
                          <option value="SUSPECT_INFO">Suspect Information Update</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <textarea value={currentReportData.narrative || ''} onChange={(e) => setCurrentReportData({...currentReportData, narrative: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 h-40 text-sm" placeholder="Enter detailed supplemental narrative..." />
                    </div>

                    {/* Evidence Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-orange-400 mb-3 border-b border-gray-600 pb-2">Evidence</h4>
                      <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-2">Did You Book In Evidence Regards to this Supplemental?</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input type="radio" name="bookedEvidence" value="YES" checked={currentReportData.bookedEvidence === 'YES'} onChange={(e) => setCurrentReportData({...currentReportData, bookedEvidence: e.target.value})} />
                            Yes
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input type="radio" name="bookedEvidence" value="NO" checked={currentReportData.bookedEvidence === 'NO'} onChange={(e) => setCurrentReportData({...currentReportData, bookedEvidence: e.target.value})} />
                            No
                          </label>
                        </div>
                      </div>
                      {currentReportData.bookedEvidence === 'YES' && (
                        <>
                          <div className="mb-3">
                            <label className="block text-xs text-gray-400 mb-1">Evidence Locker #</label>
                            <input type="text" value={currentReportData.evidenceLockerNumber || ''} onChange={(e) => setCurrentReportData({...currentReportData, evidenceLockerNumber: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">List Item(s) Description Booked</label>
                            <textarea value={currentReportData.evidenceDescription || ''} onChange={(e) => setCurrentReportData({...currentReportData, evidenceDescription: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 h-24 text-sm" placeholder="Describe all items booked into evidence..." />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Scene Images Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Attachments/Images</h4>
                      <div className="mb-3">
                        <input type="file" multiple accept="image/*" onChange={handleSceneImageUpload} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                      </div>
                      {currentReportData.sceneImages?.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {currentReportData.sceneImages.map((img: any) => (
                            <div key={img.id} className="relative bg-gray-800 rounded p-2">
                              <img src={img.data} alt={img.name} className="w-full h-24 object-cover rounded" />
                              <button onClick={() => removeSceneImage(img.id)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-500"><X size={12} /></button>
                              <input type="text" placeholder="Add note..." value={img.note || ''} onChange={(e) => updateImageNote(img.id, e.target.value)} className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Completed By Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Completed By</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Officer Name</label>
                          <input type="text" value={currentReportData.completedByOfficerName || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByOfficerName: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Badge#</label>
                          <input type="text" value={currentReportData.completedByBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Department</label>
                          <select value={currentReportData.completedByDepartment || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByDepartment: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="LSSO">LSSO</option>
                            <option value="LSSO_CONTRACT">LSSO Contract Agency</option>
                            <option value="LSSO_COMMUNITY">LSSO Community Service</option>
                            <option value="LSSO_CORRECTIONS">LSSO Corrections Department</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date</label>
                          <input type="date" value={currentReportData.completedByDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Supervisor Signature Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Supervisor Signature</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Supervisor Name</label>
                          <input type="text" value={currentReportData.supervisorName || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorName: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Supervisor Badge #</label>
                          <input type="text" value={currentReportData.supervisorBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date Signed</label>
                          <input type="date" value={currentReportData.supervisorSignDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorSignDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Report Status</label>
                          <select value={currentReportData.reportStatus || ''} onChange={(e) => setCurrentReportData({...currentReportData, reportStatus: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="APPROVED">Approved</option>
                            <option value="PENDING">Pending</option>
                            <option value="DENIED">Denied/Needs Edits</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                ) : activeReportForm === 'USE OF FORCE REPORT' ? (
                  /* Use of Force Report Form */
                  <>
                    {/* Agency Information Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Agency Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Callsign</label>
                          <input type="text" value={currentReportData.callsign || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Department</label>
                          <input type="text" value={currentReportData.department || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Name</label>
                          <input type="text" value={currentReportData.officer || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date</label>
                          <input type="text" value={currentReportData.date ? new Date(currentReportData.date).toLocaleDateString() : ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Record#</label>
                          <input type="text" value={currentReportData.recordNumber || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Officer Involved Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Officer Involved</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Officer Name</label>
                          <input type="text" value={currentReportData.officerInvolvedName || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerInvolvedName: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Badge #</label>
                          <input type="text" value={currentReportData.officerInvolvedBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerInvolvedBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Agency</label>
                          <select value={currentReportData.officerInvolvedAgency || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerInvolvedAgency: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="LSSO">LSSO</option>
                            <option value="LSSO_CONTRACT">LSSO Contract Agency</option>
                            <option value="LSSO_COMMUNITY">LSSO Community Service</option>
                            <option value="LSSO_CORRECTIONS">LSSO Corrections Department</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Rank</label>
                          <input type="text" value={currentReportData.officerInvolvedRank || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerInvolvedRank: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Approximate Time in Agency</label>
                          <input type="text" value={currentReportData.officerTimeInAgency || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerTimeInAgency: e.target.value})} placeholder="e.g., 5 years 3 months" className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Duty Status at Time of Incident</label>
                          <select value={currentReportData.officerDutyStatus || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerDutyStatus: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="ON_DUTY">On Duty</option>
                            <option value="OFF_DUTY">Off Duty</option>
                            <option value="ADMINISTRATIVE_LEAVE">Administrative Leave</option>
                            <option value="SUSPENSION">Suspension</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Incident Information Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Incident Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Incident Date</label>
                          <input type="date" value={currentReportData.incidentDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, incidentDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Incident Time</label>
                          <input type="time" value={currentReportData.incidentTime || ''} onChange={(e) => setCurrentReportData({...currentReportData, incidentTime: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Location Address</label>
                          <input type="text" value={currentReportData.locationAddress || ''} onChange={(e) => setCurrentReportData({...currentReportData, locationAddress: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Street Address" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Postal</label>
                          <input type="text" value={currentReportData.postal || ''} onChange={(e) => setCurrentReportData({...currentReportData, postal: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Dispatch Call Ref#</label>
                          <input type="text" value={currentReportData.dispatchCallRef || ''} onChange={(e) => setCurrentReportData({...currentReportData, dispatchCallRef: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Arrest Report Ref#</label>
                          <input type="text" value={currentReportData.arrestReportRef || ''} onChange={(e) => setCurrentReportData({...currentReportData, arrestReportRef: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Citation Report Ref#</label>
                          <input type="text" value={currentReportData.citationReportRef || ''} onChange={(e) => setCurrentReportData({...currentReportData, citationReportRef: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Other Agency Involvement</label>
                          <select value={currentReportData.otherAgencyInvolvement || ''} onChange={(e) => setCurrentReportData({...currentReportData, otherAgencyInvolvement: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="LSSO">LSSO</option>
                            <option value="LSPD">LSPD</option>
                            <option value="MARSHAL">Marshal</option>
                            <option value="ALL_AGENCIES">All Agencies</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Supervisor Name | ID#</label>
                          <input type="text" value={currentReportData.supervisorAdvised || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorAdvised: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Name | Badge #" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Witness Name #1</label>
                          <input type="text" value={currentReportData.witness1Name || ''} onChange={(e) => setCurrentReportData({...currentReportData, witness1Name: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Witness #1 Contact</label>
                          <input type="text" value={currentReportData.witness1Contact || ''} onChange={(e) => setCurrentReportData({...currentReportData, witness1Contact: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Witness Name #2</label>
                          <input type="text" value={currentReportData.witness2Name || ''} onChange={(e) => setCurrentReportData({...currentReportData, witness2Name: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Witness #2 Contact</label>
                          <input type="text" value={currentReportData.witness2Contact || ''} onChange={(e) => setCurrentReportData({...currentReportData, witness2Contact: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Justification for Using Force Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Justification for Using Force</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-600 rounded">
                          <input type="checkbox" id="protectSelf" checked={currentReportData.justifyProtectSelf || false} onChange={(e) => setCurrentReportData({...currentReportData, justifyProtectSelf: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="protectSelf" className="text-sm text-gray-200 cursor-pointer">To Protect Oneself or Others from Harm</label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-600 rounded">
                          <input type="checkbox" id="restrainSubdue" checked={currentReportData.justifyRestrainSubdue || false} onChange={(e) => setCurrentReportData({...currentReportData, justifyRestrainSubdue: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="restrainSubdue" className="text-sm text-gray-200 cursor-pointer">To Restrain or Subdue a Resistant Individual</label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-600 rounded">
                          <input type="checkbox" id="bringControl" checked={currentReportData.justifyBringControl || false} onChange={(e) => setCurrentReportData({...currentReportData, justifyBringControl: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="bringControl" className="text-sm text-gray-200 cursor-pointer">To Bring an Unlawful Situation Under Control</label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-600 rounded">
                          <input type="checkbox" id="other" checked={currentReportData.justifyOther || false} onChange={(e) => setCurrentReportData({...currentReportData, justifyOther: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="other" className="text-sm text-gray-200 cursor-pointer">Other (Explained in Narrative)</label>
                        </div>
                      </div>
                    </div>

                    {/* Victim of Force Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-red-400 mb-3 border-b border-gray-600 pb-2">Victim of Force</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Name</label>
                        <div className="flex gap-2">
                          <input type="text" value={partySearchName1} onChange={(e) => setPartySearchName1(e.target.value)} placeholder="Enter name..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchPersonByName(partySearchName1, 1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {partySearchResults1.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {partySearchResults1.map((p, i) => (
                              <div key={i} onClick={() => selectParty(p, 1)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {p.firstName} {p.lastName} - DOB: {p.dob}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input type="text" value={currentReportData.victimOfForce?.name || ''} onChange={(e) => setCurrentReportData({...currentReportData, victimOfForce: {...currentReportData.victimOfForce, name: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">DOB</label>
                          <input type="text" value={currentReportData.victimOfForce?.dob || ''} onChange={(e) => setCurrentReportData({...currentReportData, victimOfForce: {...currentReportData.victimOfForce, dob: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input type="text" value={currentReportData.victimOfForce?.phone || ''} onChange={(e) => setCurrentReportData({...currentReportData, victimOfForce: {...currentReportData.victimOfForce, phone: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Address</label>
                          <input type="text" value={currentReportData.victimOfForce?.address || ''} onChange={(e) => setCurrentReportData({...currentReportData, victimOfForce: {...currentReportData.victimOfForce, address: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Subject Details Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-red-400 mb-3 border-b border-gray-600 pb-2">Subject Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Subject Weapon</label>
                          <select value={currentReportData.subjectWeapon || ''} onChange={(e) => setCurrentReportData({...currentReportData, subjectWeapon: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="KNIFE">Knife</option>
                            <option value="FIREARM">Firearm</option>
                            <option value="VEHICLE">Vehicle</option>
                            <option value="HANDS_FEET">Hands/Feet</option>
                            <option value="BLUNT_OBJECT">Blunt Object</option>
                            <option value="OTHER">Other (In Narrative)</option>
                            <option value="NONE">None</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Subject Under Influence</label>
                          <select value={currentReportData.subjectInfluence || ''} onChange={(e) => setCurrentReportData({...currentReportData, subjectInfluence: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="ALCOHOL">Alcohol</option>
                            <option value="DRUGS">Drugs</option>
                            <option value="UNKNOWN">Unknown</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Subject Injured?</label>
                          <select value={currentReportData.subjectInjured || ''} onChange={(e) => setCurrentReportData({...currentReportData, subjectInjured: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="YES">Yes</option>
                            <option value="NO">No</option>
                          </select>
                        </div>
                        {currentReportData.subjectInjured === 'YES' && (
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Describe Injuries</label>
                            <input type="text" value={currentReportData.subjectInjuriesDesc || ''} onChange={(e) => setCurrentReportData({...currentReportData, subjectInjuriesDesc: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Describe injuries..." />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Medically Treated By</label>
                          <select value={currentReportData.subjectTreatedBy || ''} onChange={(e) => setCurrentReportData({...currentReportData, subjectTreatedBy: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="OFFICER">Officer</option>
                            <option value="FIRE_DEPT">Fire Department</option>
                            <option value="EMS">EMS</option>
                            <option value="REFUSED">Refused</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Transported to Hospital</label>
                          <select value={currentReportData.subjectTransported || ''} onChange={(e) => setCurrentReportData({...currentReportData, subjectTransported: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="YES">Yes</option>
                            <option value="NO">No</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Officer Information Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Officer Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Uniform</label>
                          <select value={currentReportData.officerUniform || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerUniform: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="PATROL">Patrol Uniform</option>
                            <option value="TACTICAL">Tactical Vest Stating Agency</option>
                            <option value="PLAIN_BADGE">Plain Clothes with Badge Visible</option>
                            <option value="MOTORCYCLE">Motorcycle Uniform</option>
                            <option value="AIR_SUPPORT">Air Support Uniform</option>
                            <option value="OFF_DUTY">Off Duty Civilian Attire (No Badge Visible)</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs text-gray-400 mb-1">Officer Precise Activity at Time of Incident</label>
                          <input type="text" value={currentReportData.officerActivityDesc || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerActivityDesc: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Describe officer activity..." />
                        </div>
                      </div>
                    </div>

                    {/* Weapons Utilized by Officer Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-400 mb-3 border-b border-gray-600 pb-2">Weapon(s) Utilized by Officer</h4>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponTaser" checked={currentReportData.weaponTaser || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponTaser: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponTaser" className="text-sm text-gray-200 cursor-pointer">Taser</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponFlashlight" checked={currentReportData.weaponFlashlight || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponFlashlight: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponFlashlight" className="text-sm text-gray-200 cursor-pointer">Flashlight</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponHandsFeet" checked={currentReportData.weaponHandsFeet || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponHandsFeet: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponHandsFeet" className="text-sm text-gray-200 cursor-pointer">Hands/Feet</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponCanine" checked={currentReportData.weaponCanine || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponCanine: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponCanine" className="text-sm text-gray-200 cursor-pointer">Canine</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponBaton" checked={currentReportData.weaponBaton || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponBaton: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponBaton" className="text-sm text-gray-200 cursor-pointer">Baton</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponHandgun" checked={currentReportData.weaponHandgun || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponHandgun: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponHandgun" className="text-sm text-gray-200 cursor-pointer">Handgun</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponRifle" checked={currentReportData.weaponRifle || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponRifle: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponRifle" className="text-sm text-gray-200 cursor-pointer">Rifle</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponShotgun" checked={currentReportData.weaponShotgun || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponShotgun: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponShotgun" className="text-sm text-gray-200 cursor-pointer">Shotgun</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponVehicle" checked={currentReportData.weaponVehicle || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponVehicle: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponVehicle" className="text-sm text-gray-200 cursor-pointer">Vehicle</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponCSGas" checked={currentReportData.weaponCSGas || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponCSGas: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponCSGas" className="text-sm text-gray-200 cursor-pointer">CS Gas</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="weaponOther" checked={currentReportData.weaponOther || false} onChange={(e) => setCurrentReportData({...currentReportData, weaponOther: e.target.checked})} className="w-4 h-4" />
                          <label htmlFor="weaponOther" className="text-sm text-gray-200 cursor-pointer">Other (In Narrative)</label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Approximate Rounds Fired</label>
                          <input type="text" value={currentReportData.roundsFired || ''} onChange={(e) => setCurrentReportData({...currentReportData, roundsFired: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="e.g., 3 rounds" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Taser Cartridges Used</label>
                          <input type="text" value={currentReportData.taserCartridges || ''} onChange={(e) => setCurrentReportData({...currentReportData, taserCartridges: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="e.g., 2 cartridges" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Describe Impact Locations</label>
                          <input type="text" value={currentReportData.impactLocations || ''} onChange={(e) => setCurrentReportData({...currentReportData, impactLocations: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Describe where weapon impacted..." />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Describe Weapon Usage</label>
                          <input type="text" value={currentReportData.weaponUsageDesc || ''} onChange={(e) => setCurrentReportData({...currentReportData, weaponUsageDesc: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Describe how weapon was used..." />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Effectiveness of Applied Weapon(s)</label>
                          <input type="text" value={currentReportData.weaponEffectiveness || ''} onChange={(e) => setCurrentReportData({...currentReportData, weaponEffectiveness: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Describe effectiveness..." />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Injured?</label>
                          <select value={currentReportData.officerInjured || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerInjured: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="YES">Yes</option>
                            <option value="NO">No</option>
                          </select>
                        </div>
                        {currentReportData.officerInjured === 'YES' && (
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">If Injured Describe Injuries</label>
                            <input type="text" value={currentReportData.officerInjuriesDesc || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerInjuriesDesc: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Describe injuries..." />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Release by Doctor</label>
                          <select value={currentReportData.releasedByDoctor || ''} onChange={(e) => setCurrentReportData({...currentReportData, releasedByDoctor: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="YES">Yes</option>
                            <option value="NO">No</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Narrative Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Narrative</h4>
                      <textarea value={currentReportData.narrative || ''} onChange={(e) => setCurrentReportData({...currentReportData, narrative: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 h-40 text-sm" placeholder="Provide a detailed account of the incident and use of force..." />
                    </div>

                    {/* Certification Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-400 mb-3 border-b border-gray-600 pb-2">Certification</h4>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <input type="checkbox" id="certifyAccuracy" checked={currentReportData.certifyAccuracy || false} onChange={(e) => setCurrentReportData({...currentReportData, certifyAccuracy: e.target.checked})} className="w-4 h-4 mt-1" />
                          <label htmlFor="certifyAccuracy" className="text-sm text-gray-200 cursor-pointer">I UNDERSTAND FALSIFICATION OF THIS DOCUMENT MAY RESULT IN DISCIPLINARY ACTION</label>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date Submitted</label>
                          <input type="date" value={currentReportData.dateSubmitted || ''} onChange={(e) => setCurrentReportData({...currentReportData, dateSubmitted: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Chain of Command Review Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-400 mb-3 border-b border-gray-600 pb-2">Chain of Command Review</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Administration Signature</label>
                          <input type="text" value={currentReportData.administrationSignature || ''} onChange={(e) => setCurrentReportData({...currentReportData, administrationSignature: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Name/Title" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date</label>
                          <input type="date" value={currentReportData.chainOfCommandDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, chainOfCommandDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Result</label>
                          <select value={currentReportData.reviewResult || ''} onChange={(e) => setCurrentReportData({...currentReportData, reviewResult: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="APPROVED">Approved</option>
                            <option value="NEEDS_REVIEW">Needs Review</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Final Ruling</label>
                          <select value={currentReportData.finalRuling || ''} onChange={(e) => setCurrentReportData({...currentReportData, finalRuling: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="PROPER_USE">Proper Use of Force</option>
                            <option value="RETRAINING">Retraining Class Required</option>
                            <option value="SUSPENSION">Suspension Until Further Notice</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Detective Reference Area Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-orange-400 mb-3 border-b border-gray-600 pb-2">Detective Reference Area</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Detective Assigned</label>
                          <input type="text" value={currentReportData.detectiveAssigned || ''} onChange={(e) => setCurrentReportData({...currentReportData, detectiveAssigned: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Detective Badge #</label>
                          <input type="text" value={currentReportData.detectiveBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, detectiveBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Detective Agency</label>
                          <select value={currentReportData.detectiveAgency || ''} onChange={(e) => setCurrentReportData({...currentReportData, detectiveAgency: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="LSSO">LSSO</option>
                            <option value="LSPD">LSPD</option>
                            <option value="MARSHAL">Marshal</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Detective Case Status</label>
                          <select value={currentReportData.detectiveCaseStatus || ''} onChange={(e) => setCurrentReportData({...currentReportData, detectiveCaseStatus: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="COMPLETE">Complete</option>
                            <option value="UNDER_INVESTIGATION">Under Investigation</option>
                            <option value="PENDING_ASSIGNMENT">Pending Detective Assignment</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-xs text-gray-400 mb-1">Detective Reference Info</label>
                        <textarea value={currentReportData.detectiveReferenceInfo || ''} onChange={(e) => setCurrentReportData({...currentReportData, detectiveReferenceInfo: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 h-20 text-sm" placeholder="Any additional reference information..." />
                      </div>
                    </div>
                  </>
                ) : activeReportForm === 'GENERAL REPORT' ? (
                  /* General Report Form */
                  <>
                    {/* Agency Information Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Agency Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Callsign</label>
                          <input type="text" value={currentReportData.callsign || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Department</label>
                          <input type="text" value={currentReportData.department || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Name</label>
                          <input type="text" value={currentReportData.officer || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Record#</label>
                          <input type="text" value={currentReportData.recordNumber || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Type of Report Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Type of Report</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2 md:col-span-4">
                          <label className="block text-xs text-gray-400 mb-1">Report Type</label>
                          <select value={currentReportData.reportType || ''} onChange={(e) => setCurrentReportData({...currentReportData, reportType: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="SUSPICIOUS">Suspicious Circumstance</option>
                            <option value="CRIMINAL_ACTION">Criminal Actions Awaiting Capture</option>
                            <option value="PUBLIC_INQUIRY">Public Inquiry</option>
                            <option value="FURTHER_INVESTIGATION">Needs Further Investigation</option>
                            <option value="DOCUMENTED">Documented Interaction</option>
                            <option value="FIELD_INTERVIEW">Field Interview</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Case Information Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Case Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date of Incident</label>
                          <input type="date" value={currentReportData.incidentDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, incidentDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Time of Incident</label>
                          <input type="time" value={currentReportData.incidentTime || ''} onChange={(e) => setCurrentReportData({...currentReportData, incidentTime: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Primary Department</label>
                          <select value={currentReportData.primaryDepartment || ''} onChange={(e) => setCurrentReportData({...currentReportData, primaryDepartment: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="LSSO">LSSO</option>
                            <option value="LSSO_COMMUNITY">LSSO Community Service</option>
                            <option value="LSSO_CONTRACT">LSSO Contract Agency</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Criminal Charges Possible</label>
                          <select value={currentReportData.criminalCharges || ''} onChange={(e) => setCurrentReportData({...currentReportData, criminalCharges: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="YES">Yes</option>
                            <option value="NO">No</option>
                            <option value="PENDING">Pending Investigation</option>
                            <option value="UNKNOWN">Unknown</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Location of Incident</label>
                          <input type="text" value={currentReportData.location || ''} onChange={(e) => setCurrentReportData({...currentReportData, location: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Postal</label>
                          <input type="text" value={currentReportData.postal || ''} onChange={(e) => setCurrentReportData({...currentReportData, postal: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Vehicle #1 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-400 mb-3 border-b border-gray-600 pb-2">Vehicle #1 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Plate</label>
                        <div className="flex gap-2">
                          <input type="text" value={vehicleSearchPlate1} onChange={(e) => setVehicleSearchPlate1(e.target.value)} placeholder="Enter plate number..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchVehicleByPlate(vehicleSearchPlate1, 1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {vehicleSearchResults1.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {vehicleSearchResults1.map((v, i) => (
                              <div key={i} onClick={() => selectVehicle(v, 1)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {v.plate} - {v.year} {v.make} {v.model} ({v.color}) - Owner: {v.ownerName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Plate</label>
                          <input type="text" value={currentReportData.vehicle1?.plate || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, plate: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Year</label>
                          <input type="text" value={currentReportData.vehicle1?.year || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, year: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Make</label>
                          <input type="text" value={currentReportData.vehicle1?.make || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, make: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Model</label>
                          <input type="text" value={currentReportData.vehicle1?.model || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, model: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Color</label>
                          <input type="text" value={currentReportData.vehicle1?.color || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, color: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Party #1 Information - General Report */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-400 mb-3 border-b border-gray-600 pb-2">Party #1 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Name</label>
                        <div className="flex gap-2">
                          <input type="text" value={partySearchName1} onChange={(e) => setPartySearchName1(e.target.value)} placeholder="Enter name..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchPersonByName(partySearchName1, 1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {partySearchResults1.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {partySearchResults1.map((p, i) => (
                              <div key={i} onClick={() => selectParty(p, 1)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {p.firstName} {p.lastName} - DOB: {p.dob}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input type="text" value={currentReportData.party1?.name || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, name: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">DOB</label>
                          <input type="text" value={currentReportData.party1?.dob || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, dob: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input type="text" value={currentReportData.party1?.phone || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, phone: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Address</label>
                          <input type="text" value={currentReportData.party1?.address || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, address: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Party #1 Details Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-cyan-400 mb-3 border-b border-gray-600 pb-2">Party #1 Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Party #1 Involvement</label>
                          <select value={currentReportData.party1Involvement || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1Involvement: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="VICTIM">Victim</option>
                            <option value="WITNESS">Witness</option>
                            <option value="SUSPECT">Suspect</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        {currentReportData.party1Involvement === 'OTHER' && (
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">If Other</label>
                            <input type="text" value={currentReportData.party1InvolvementOther || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1InvolvementOther: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Specify other involvement..." />
                          </div>
                        )}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Party #1 Phone Number</label>
                          <input type="text" value={currentReportData.party1PhoneNumber || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1PhoneNumber: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Phone number..." />
                        </div>
                      </div>
                    </div>

                    {/* Vehicle #2 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-400 mb-3 border-b border-gray-600 pb-2">Vehicle #2 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Plate</label>
                        <div className="flex gap-2">
                          <input type="text" value={vehicleSearchPlate2} onChange={(e) => setVehicleSearchPlate2(e.target.value)} placeholder="Enter plate number..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchVehicleByPlate(vehicleSearchPlate2, 2)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {vehicleSearchResults2.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {vehicleSearchResults2.map((v, i) => (
                              <div key={i} onClick={() => selectVehicle(v, 2)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {v.plate} - {v.year} {v.make} {v.model} ({v.color}) - Owner: {v.ownerName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Plate</label>
                          <input type="text" value={currentReportData.vehicle2?.plate || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, plate: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Year</label>
                          <input type="text" value={currentReportData.vehicle2?.year || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, year: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Make</label>
                          <input type="text" value={currentReportData.vehicle2?.make || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, make: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Model</label>
                          <input type="text" value={currentReportData.vehicle2?.model || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, model: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Color</label>
                          <input type="text" value={currentReportData.vehicle2?.color || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle2: {...currentReportData.vehicle2, color: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Party #2 Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-400 mb-3 border-b border-gray-600 pb-2">Party #2 Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Name</label>
                        <div className="flex gap-2">
                          <input type="text" value={partySearchName2} onChange={(e) => setPartySearchName2(e.target.value)} placeholder="Enter name..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchPersonByName(partySearchName2, 2)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {partySearchResults2.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {partySearchResults2.map((p, i) => (
                              <div key={i} onClick={() => selectParty(p, 2)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {p.firstName} {p.lastName} - DOB: {p.dob}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input type="text" value={currentReportData.party2?.name || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, name: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">DOB</label>
                          <input type="text" value={currentReportData.party2?.dob || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, dob: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input type="text" value={currentReportData.party2?.phone || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, phone: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Address</label>
                          <input type="text" value={currentReportData.party2?.address || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2: {...currentReportData.party2, address: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Party #2 Details Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-cyan-400 mb-3 border-b border-gray-600 pb-2">Party #2 Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Party #2 Involvement</label>
                          <select value={currentReportData.party2Involvement || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2Involvement: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="VICTIM">Victim</option>
                            <option value="WITNESS">Witness</option>
                            <option value="SUSPECT">Suspect</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        {currentReportData.party2Involvement === 'OTHER' && (
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">If Other</label>
                            <input type="text" value={currentReportData.party2InvolvementOther || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2InvolvementOther: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Specify other involvement..." />
                          </div>
                        )}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Party #2 Phone Number</label>
                          <input type="text" value={currentReportData.party2PhoneNumber || ''} onChange={(e) => setCurrentReportData({...currentReportData, party2PhoneNumber: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Phone number..." />
                        </div>
                      </div>
                    </div>

                    {/* Narrative Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Narrative</h4>
                      <textarea value={currentReportData.narrative || ''} onChange={(e) => setCurrentReportData({...currentReportData, narrative: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 h-40 text-sm" placeholder="Enter detailed narrative of the incident..." />
                    </div>

                    {/* Evidence Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-orange-400 mb-3 border-b border-gray-600 pb-2">Evidence</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Did You Book Evidence in Regards to This Report?</label>
                          <select value={currentReportData.bookedEvidence || ''} onChange={(e) => setCurrentReportData({...currentReportData, bookedEvidence: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="YES">Yes</option>
                            <option value="NO">No</option>
                          </select>
                        </div>
                        {currentReportData.bookedEvidence === 'YES' && (
                          <>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">What Locker # Was Evidence Booked Into</label>
                              <input type="text" value={currentReportData.evidenceLocker || ''} onChange={(e) => setCurrentReportData({...currentReportData, evidenceLocker: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Locker number..." />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">List Item(s) Description Booked</label>
                              <textarea value={currentReportData.evidenceItems || ''} onChange={(e) => setCurrentReportData({...currentReportData, evidenceItems: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 h-20 text-sm" placeholder="Describe items booked..." />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Scene Images Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Scene Images</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-2">Image Description</label>
                        <input type="text" value={currentReportData.imageDescription || ''} onChange={(e) => setCurrentReportData({...currentReportData, imageDescription: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm mb-2" placeholder="Describe what these images show..." />
                        <input type="file" multiple accept="image/*" onChange={handleSceneImageUpload} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                      </div>
                      {currentReportData.sceneImages?.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {currentReportData.sceneImages.map((img: any) => (
                            <div key={img.id} className="relative bg-gray-800 rounded p-2">
                              <img src={img.data} alt={img.name} className="w-full h-24 object-cover rounded" />
                              <button onClick={() => removeSceneImage(img.id)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-500"><X size={12} /></button>
                              <input type="text" placeholder="Add note..." value={img.note || ''} onChange={(e) => updateImageNote(img.id, e.target.value)} className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Administrative Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Administrative</h4>
                      <div className="space-y-4">
                        <div className="border-b border-gray-600 pb-4">
                          <h5 className="text-sm font-semibold text-gray-300 mb-3">Officer Section</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-400 mb-1">Officer Signature</label>
                              <input type="text" value={currentReportData.officerSignature || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerSignature: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Name/Signature" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Officer Badge #</label>
                              <input type="text" value={currentReportData.officerBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Date</label>
                              <input type="date" value={currentReportData.officerDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                            </div>
                            <div className="col-span-2 md:col-span-4">
                              <label className="block text-xs text-gray-400 mb-1">Status Report</label>
                              <select value={currentReportData.officerStatus || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerStatus: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                                <option value="">Select...</option>
                                <option value="DOCUMENTATION_ONLY">Documentation Only</option>
                                <option value="FORWARD_DETECTIVE">Request Forward to Detectives</option>
                                <option value="IN_PROGRESS">In-Progress/Still Writing</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-semibold text-gray-300 mb-3">Supervisor Section</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-400 mb-1">Supervisor Signature</label>
                              <input type="text" value={currentReportData.supervisorSignature || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorSignature: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Name/Signature" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Supervisor Badge #</label>
                              <input type="text" value={currentReportData.supervisorBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Date</label>
                              <input type="date" value={currentReportData.supervisorDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                            </div>
                            <div className="col-span-2 md:col-span-4">
                              <label className="block text-xs text-gray-400 mb-1">Status</label>
                              <select value={currentReportData.supervisorStatus || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorStatus: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                                <option value="">Select...</option>
                                <option value="CLOSED_APPROVED">Closed/Approved</option>
                                <option value="FORWARD_DETECTIVE">Forward to Detectives</option>
                                <option value="DETECTIVE_PROCESSING">Detectives Processing</option>
                                <option value="DENIED_REWRITE">Denied/Needs Re-write</option>
                              </select>
                            </div>
                            <div className="col-span-2 md:col-span-4">
                              <label className="block text-xs text-gray-400 mb-1">Has Case Gone to Court?</label>
                              <select value={currentReportData.caseTooCourt || ''} onChange={(e) => setCurrentReportData({...currentReportData, caseTooCourt: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                                <option value="">Select...</option>
                                <option value="YES">Yes</option>
                                <option value="NO">No</option>
                                <option value="UNDER_TRIAL">Case Under Trial</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detective Section - Only Complete if Detective */}
                    <div className="bg-gray-700 rounded-lg p-4 border-2 border-red-400">
                      <h4 className="text-md font-semibold text-red-400 mb-3 border-b border-gray-600 pb-2">⚠️ ONLY COMPLETE IF DETECTIVE - Investigative/Detective Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Detective Assigned</label>
                          <input type="text" value={currentReportData.detectiveAssigned || ''} onChange={(e) => setCurrentReportData({...currentReportData, detectiveAssigned: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Detective Badge #</label>
                          <input type="text" value={currentReportData.detectiveBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, detectiveBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Detective Agency</label>
                          <select value={currentReportData.detectiveAgency || ''} onChange={(e) => setCurrentReportData({...currentReportData, detectiveAgency: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="LSSO">LSSO</option>
                            <option value="LSPD">LSPD</option>
                            <option value="MARSHAL">Marshal</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Case Status</label>
                          <select value={currentReportData.detectiveCaseStatus || ''} onChange={(e) => setCurrentReportData({...currentReportData, detectiveCaseStatus: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="COMPLETE">Complete/Closed</option>
                            <option value="INPROGRESS">In-Progress Investigation</option>
                            <option value="PENDING">Case Awaiting Assignment</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-xs text-gray-400 mb-1">Detective Reference (Include Agency Case # If Needed)</label>
                        <textarea value={currentReportData.detectiveReference || ''} onChange={(e) => setCurrentReportData({...currentReportData, detectiveReference: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 h-20 text-sm" placeholder="Reference information..." />
                      </div>
                    </div>

                    {/* Link Cases/Citations Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Link Cases/Citations</h4>
                      <button onClick={addLinkedReport} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm mb-3">+ Add Link</button>
                      {currentReportData.linkedReports?.map((link: any, index: number) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <select value={link.type || ''} onChange={(e) => { const newLinks = [...currentReportData.linkedReports]; newLinks[index] = { ...newLinks[index], type: e.target.value }; setCurrentReportData({...currentReportData, linkedReports: newLinks}); }} className="bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Type...</option>
                            <option value="ARREST">Arrest</option>
                            <option value="CITATION">Citation</option>
                            <option value="TOW">Tow Report</option>
                            <option value="SUPPLEMENTAL">Supplemental</option>
                          </select>
                          <input type="text" placeholder="Report/Record #" value={link.number || ''} onChange={(e) => { const newLinks = [...currentReportData.linkedReports]; newLinks[index] = { ...newLinks[index], number: e.target.value }; setCurrentReportData({...currentReportData, linkedReports: newLinks}); }} className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => removeLinkedReport(index)} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-500"><X size={16} /></button>
                        </div>
                      ))}
                    </div>

                    {/* Admin Only Flags Section */}
                    <div className="bg-gray-700 rounded-lg p-4 border-2 border-orange-400">
                      <h4 className="text-md font-semibold text-orange-400 mb-3 border-b border-gray-600 pb-2">⚠️ ADMIN ONLY FLAGS</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 text-sm text-gray-200 cursor-pointer">
                          <input type="checkbox" checked={currentReportData.knownArmed || false} onChange={(e) => setCurrentReportData({...currentReportData, knownArmed: e.target.checked})} className="w-4 h-4" />
                          Known to Be Armed
                        </label>
                        <label className="flex items-center gap-3 text-sm text-gray-200 cursor-pointer">
                          <input type="checkbox" checked={currentReportData.violentAgainstLE || false} onChange={(e) => setCurrentReportData({...currentReportData, violentAgainstLE: e.target.checked})} className="w-4 h-4" />
                          Violent Against Law Enforcement
                        </label>
                        <label className="flex items-center gap-3 text-sm text-gray-200 cursor-pointer">
                          <input type="checkbox" checked={currentReportData.mentalHealthAdvisory || false} onChange={(e) => setCurrentReportData({...currentReportData, mentalHealthAdvisory: e.target.checked})} className="w-4 h-4" />
                          Mental Health Advisory
                        </label>
                        <label className="flex items-center gap-3 text-sm text-gray-200 cursor-pointer">
                          <input type="checkbox" checked={currentReportData.gangAffiliation || false} onChange={(e) => setCurrentReportData({...currentReportData, gangAffiliation: e.target.checked})} className="w-4 h-4" />
                          Gang Affiliation
                        </label>
                      </div>
                    </div>
                  </>
                ) : activeReportForm === 'VEHICLE TOW/RELEASE REPORT' ? (
                  /* Vehicle Tow/Release Report Form */
                  <>
                    {/* Agency Information Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Agency Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Callsign</label>
                          <input type="text" value={currentReportData.callsign || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Department</label>
                          <input type="text" value={currentReportData.department || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Name</label>
                          <input type="text" value={currentReportData.officer || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date</label>
                          <input type="text" value={currentReportData.date ? new Date(currentReportData.date).toLocaleDateString() : ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Record#</label>
                          <input type="text" value={currentReportData.recordNumber || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Report Type</label>
                          <select value={currentReportData.towType || ''} onChange={(e) => setCurrentReportData({...currentReportData, towType: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="TOW">Vehicle Tow</option>
                            <option value="RELEASE">Vehicle Release</option>
                            <option value="IMPOUND">Vehicle Impound</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Reference Information Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-400 mb-3 border-b border-gray-600 pb-2">Reference Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Dispatch Call ID#</label>
                          <input type="text" value={currentReportData.dispatchCallId || ''} onChange={(e) => setCurrentReportData({...currentReportData, dispatchCallId: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Street Towed From</label>
                          <input type="text" value={currentReportData.streetTowedFrom || ''} onChange={(e) => setCurrentReportData({...currentReportData, streetTowedFrom: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Postal</label>
                          <input type="text" value={currentReportData.postal || ''} onChange={(e) => setCurrentReportData({...currentReportData, postal: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-400 mb-3 border-b border-gray-600 pb-2">Vehicle Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Plate</label>
                        <div className="flex gap-2">
                          <input type="text" value={vehicleSearchPlate1} onChange={(e) => setVehicleSearchPlate1(e.target.value)} placeholder="Enter plate number..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchVehicleByPlate(vehicleSearchPlate1, 1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {vehicleSearchResults1.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {vehicleSearchResults1.map((v, i) => (
                              <div key={i} onClick={() => selectVehicle(v, 1)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {v.plate} - {v.year} {v.make} {v.model} ({v.color}) - Owner: {v.ownerName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Plate</label>
                          <input type="text" value={currentReportData.vehicle1?.plate || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, plate: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Year</label>
                          <input type="text" value={currentReportData.vehicle1?.year || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, year: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Make</label>
                          <input type="text" value={currentReportData.vehicle1?.make || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, make: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Model</label>
                          <input type="text" value={currentReportData.vehicle1?.model || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, model: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Color</label>
                          <input type="text" value={currentReportData.vehicle1?.color || ''} onChange={(e) => setCurrentReportData({...currentReportData, vehicle1: {...currentReportData.vehicle1, color: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Work Vehicle?</label>
                          <select value={currentReportData.isWorkVehicle || ''} onChange={(e) => setCurrentReportData({...currentReportData, isWorkVehicle: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="YES">Yes</option>
                            <option value="NO">No</option>
                          </select>
                        </div>
                        {currentReportData.isWorkVehicle === 'YES' && (
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">Company/Job Info</label>
                            <input type="text" value={currentReportData.companyJobInfo || ''} onChange={(e) => setCurrentReportData({...currentReportData, companyJobInfo: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Company name or job details..." />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={currentReportData.vehicleStored || false} onChange={(e) => setCurrentReportData({...currentReportData, vehicleStored: e.target.checked})} className="w-4 h-4" />
                          <label className="text-sm text-gray-300">Stored</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={currentReportData.vehicleImpoundedRetrievable || false} onChange={(e) => setCurrentReportData({...currentReportData, vehicleImpoundedRetrievable: e.target.checked})} className="w-4 h-4" />
                          <label className="text-sm text-gray-300">Impounded (Retrievable by Owner)</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={currentReportData.vehicleImpoundedLawHold || false} onChange={(e) => setCurrentReportData({...currentReportData, vehicleImpoundedLawHold: e.target.checked})} className="w-4 h-4" />
                          <label className="text-sm text-gray-300">Impounded (Law Agency Hold)</label>
                        </div>
                      </div>
                    </div>

                    {/* Registered Owner Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-400 mb-3 border-b border-gray-600 pb-2">Registered Owner Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Name</label>
                        <div className="flex gap-2">
                          <input type="text" value={partySearchName1} onChange={(e) => setPartySearchName1(e.target.value)} placeholder="Enter name..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchPersonByName(partySearchName1, 1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {partySearchResults1.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {partySearchResults1.map((p, i) => (
                              <div key={i} onClick={() => selectParty(p, 1)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {p.firstName} {p.lastName} - DOB: {p.dob}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Registered Owner Name</label>
                          <input type="text" value={currentReportData.party1?.name || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, name: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">DOB</label>
                          <input type="text" value={currentReportData.party1?.dob || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, dob: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input type="text" value={currentReportData.party1?.phone || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, phone: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Address</label>
                          <input type="text" value={currentReportData.party1?.address || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, address: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Towing Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-orange-400 mb-3 border-b border-gray-600 pb-2">Towing Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Towing Company</label>
                          <select value={currentReportData.towingCompany || ''} onChange={(e) => setCurrentReportData({...currentReportData, towingCompany: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="ACTION_TOWING">Action Towing Inc</option>
                            <option value="COUNTY_TOW">County Tow</option>
                            <option value="LSSO_TOW">LSSO Tow Service</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Driver Name</label>
                          <input type="text" value={currentReportData.driverName || ''} onChange={(e) => setCurrentReportData({...currentReportData, driverName: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Tow driver name..." />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Towing Authority/Reason</label>
                          <select value={currentReportData.towingAuthority || ''} onChange={(e) => setCurrentReportData({...currentReportData, towingAuthority: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="BLOCKING_ROADWAY">Vehicle Blocking Roadway</option>
                            <option value="ILLEGAL_PARKING">Vehicle Illegally Parked</option>
                            <option value="INCAPACITATED_DRIVER">Driver Incapacitated/Unable to Drive</option>
                            <option value="DRIVER_ARRESTED">Driver Arrested</option>
                            <option value="OTHER_REMARKS">Other (In Remarks)</option>
                            <option value="OWNER_REQUESTED">Registered Owner Requested</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Release Vehicle To</label>
                          <select value={currentReportData.releaseVehicleTo || ''} onChange={(e) => setCurrentReportData({...currentReportData, releaseVehicleTo: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="OWNER">Registered Owner</option>
                            <option value="HOLD_DATE">Agency Hold Until Specified Date</option>
                            <option value="HOLD_NOTICE">Agency Hold Until Further Notice</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Agency Hold Duration</label>
                          <select value={currentReportData.agencyHoldDuration || ''} onChange={(e) => setCurrentReportData({...currentReportData, agencyHoldDuration: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="NO_HOLD">No Hold</option>
                            <option value="1_HOUR">1 Hour</option>
                            <option value="4_HOURS">4 Hours</option>
                            <option value="12_HOURS">12 Hours</option>
                            <option value="24_HOURS">24 Hours</option>
                            <option value="3_DAYS">3 Days</option>
                            <option value="7_DAYS">7 Days</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Driver Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-indigo-400 mb-3 border-b border-gray-600 pb-2">Driver Information</h4>
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={currentReportData.driverSameAsOwner || false} onChange={(e) => setCurrentReportData({...currentReportData, driverSameAsOwner: e.target.checked})} className="w-4 h-4" />
                          <label className="text-sm text-gray-300">Same as Registered Owner</label>
                        </div>
                      </div>
                      {!currentReportData.driverSameAsOwner && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">Driver Name</label>
                            <input type="text" value={currentReportData.driverInformationName || ''} onChange={(e) => setCurrentReportData({...currentReportData, driverInformationName: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Driver name..." />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Arrested / Section</label>
                            <input type="text" value={currentReportData.arrestedSection || ''} onChange={(e) => setCurrentReportData({...currentReportData, arrestedSection: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="PC Section..." />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Arresting Agency</label>
                            <select value={currentReportData.arrestingAgency || ''} onChange={(e) => setCurrentReportData({...currentReportData, arrestingAgency: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                              <option value="">Select...</option>
                              <option value="LSSO">LSSO</option>
                              <option value="LSSO_METRO">LSSO - Metro</option>
                              <option value="LSSO_PALETO">LSSO - Paleto</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Officer Badge#</label>
                            <input type="text" value={currentReportData.arrestingOfficerBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, arrestingOfficerBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Badge number..." />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remarks Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-green-400 mb-3 border-b border-gray-600 pb-2">Remarks</h4>
                      <textarea value={currentReportData.remarks || ''} onChange={(e) => setCurrentReportData({...currentReportData, remarks: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 h-24 text-sm" placeholder="LIST PROPERTY, TOOLS, VEHICLE DAMAGE, ARRESTS" />
                    </div>

                    {/* Authorizing Signature Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Authorizing Signature</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Officer Signature</label>
                          <input type="text" value={currentReportData.officerSignature || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerSignature: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Signature..." />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Badge#</label>
                          <input type="text" value={currentReportData.officerBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Badge number..." />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Agency</label>
                          <select value={currentReportData.officerAgency || ''} onChange={(e) => setCurrentReportData({...currentReportData, officerAgency: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="LSSO">LSSO</option>
                            <option value="LSSO_COMMUNITY">LSSO Community Service</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Administrative Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Administrative</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Supervisor Signature</label>
                          <input type="text" value={currentReportData.supervisorSignature || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorSignature: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Signature..." />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Supervisor Badge#</label>
                          <input type="text" value={currentReportData.supervisorBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" placeholder="Badge number..." />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date</label>
                          <input type="date" value={currentReportData.administrativeDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, administrativeDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Fallback Generic Report Form for remaining types */
                  <>
                    {/* Agency Information Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Agency Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Callsign</label>
                          <input type="text" value={currentReportData.callsign || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Department</label>
                          <input type="text" value={currentReportData.department || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Officer Name</label>
                          <input type="text" value={currentReportData.officer || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date</label>
                          <input type="text" value={currentReportData.date ? new Date(currentReportData.date).toLocaleDateString() : ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Record#</label>
                          <input type="text" value={currentReportData.recordNumber || ''} readOnly className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Location Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Location</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Location/Address</label>
                          <input type="text" value={currentReportData.location || ''} onChange={(e) => setCurrentReportData({...currentReportData, location: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Postal</label>
                          <input type="text" value={currentReportData.postal || ''} onChange={(e) => setCurrentReportData({...currentReportData, postal: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date of Incident</label>
                          <input type="date" value={currentReportData.incidentDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, incidentDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Time of Incident</label>
                          <input type="time" value={currentReportData.incidentTime || ''} onChange={(e) => setCurrentReportData({...currentReportData, incidentTime: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Involved Party Information */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-400 mb-3 border-b border-gray-600 pb-2">Involved Party Information</h4>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Search by Name</label>
                        <div className="flex gap-2">
                          <input type="text" value={partySearchName1} onChange={(e) => setPartySearchName1(e.target.value)} placeholder="Enter name..." className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => searchPersonByName(partySearchName1, 1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm">Search</button>
                        </div>
                        {partySearchResults1.length > 0 && (
                          <div className="mt-2 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            {partySearchResults1.map((p, i) => (
                              <div key={i} onClick={() => selectParty(p, 1)} className="p-2 hover:bg-gray-700 cursor-pointer rounded text-sm">
                                {p.firstName} {p.lastName} - DOB: {p.dob}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input type="text" value={currentReportData.party1?.name || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, name: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">DOB</label>
                          <input type="text" value={currentReportData.party1?.dob || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, dob: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input type="text" value={currentReportData.party1?.phone || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, phone: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Address</label>
                          <input type="text" value={currentReportData.party1?.address || ''} onChange={(e) => setCurrentReportData({...currentReportData, party1: {...currentReportData.party1, address: e.target.value}})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Narrative Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Narrative</h4>
                      <textarea value={currentReportData.narrative || ''} onChange={(e) => setCurrentReportData({...currentReportData, narrative: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 h-40 text-sm" placeholder="Enter detailed narrative..." />
                    </div>

                    {/* Scene Images Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Attachments/Images</h4>
                      <div className="mb-3">
                        <input type="file" multiple accept="image/*" onChange={handleSceneImageUpload} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                      </div>
                      {currentReportData.sceneImages?.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {currentReportData.sceneImages.map((img: any) => (
                            <div key={img.id} className="relative bg-gray-800 rounded p-2">
                              <img src={img.data} alt={img.name} className="w-full h-24 object-cover rounded" />
                              <button onClick={() => removeSceneImage(img.id)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-500"><X size={12} /></button>
                              <input type="text" placeholder="Add note..." value={img.note || ''} onChange={(e) => updateImageNote(img.id, e.target.value)} className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Completed By Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Completed By</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Officer Name</label>
                          <input type="text" value={currentReportData.completedByOfficerName || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByOfficerName: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Badge#</label>
                          <input type="text" value={currentReportData.completedByBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Department</label>
                          <select value={currentReportData.completedByDepartment || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByDepartment: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="LSSO">LSSO</option>
                            <option value="LSSO_CONTRACT">LSSO Contract Agency</option>
                            <option value="LSSO_COMMUNITY">LSSO Community Service</option>
                            <option value="LSSO_CORRECTIONS">LSSO Corrections Department</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date</label>
                          <input type="date" value={currentReportData.completedByDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, completedByDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Supervisor Signature Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Supervisor Signature</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Supervisor Name</label>
                          <input type="text" value={currentReportData.supervisorName || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorName: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Supervisor Badge #</label>
                          <input type="text" value={currentReportData.supervisorBadge || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorBadge: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Date Signed</label>
                          <input type="date" value={currentReportData.supervisorSignDate || ''} onChange={(e) => setCurrentReportData({...currentReportData, supervisorSignDate: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Report Status</label>
                          <select value={currentReportData.reportStatus || ''} onChange={(e) => setCurrentReportData({...currentReportData, reportStatus: e.target.value})} className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Select...</option>
                            <option value="APPROVED">Approved</option>
                            <option value="PENDING">Pending</option>
                            <option value="DENIED">Denied/Needs Edits</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Linked Reports/Records Section */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-2">Linked Reports/Records</h4>
                      <button onClick={addLinkedReport} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm mb-3">+ Add Link</button>
                      {currentReportData.linkedReports?.map((link: any, index: number) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <select value={link.type || ''} onChange={(e) => { const newLinks = [...currentReportData.linkedReports]; newLinks[index] = { ...newLinks[index], type: e.target.value }; setCurrentReportData({...currentReportData, linkedReports: newLinks}); }} className="bg-gray-600 text-white rounded px-3 py-2 text-sm">
                            <option value="">Type...</option>
                            <option value="ARREST">Arrest</option>
                            <option value="CITATION">Citation</option>
                            <option value="TOW">Tow Report</option>
                            <option value="SUPPLEMENTAL">Supplemental</option>
                          </select>
                          <input type="text" placeholder="Report/Record #" value={link.number || ''} onChange={(e) => { const newLinks = [...currentReportData.linkedReports]; newLinks[index] = { ...newLinks[index], number: e.target.value }; setCurrentReportData({...currentReportData, linkedReports: newLinks}); }} className="flex-1 bg-gray-600 text-white rounded px-3 py-2 text-sm" />
                          <button onClick={() => removeLinkedReport(index)} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-500"><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setActiveReportForm(null);
                      setCurrentReportData({});
                      setEditingReportId(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCurrentReportData({...currentReportData, status: 'DRAFT'});
                      saveReport();
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-500"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => {
                      setCurrentReportData({...currentReportData, status: 'SUBMITTED'});
                      saveReport();
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
                  >
                    {editingReportId ? 'Save' : 'Add Record'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Record Form Modal */}
        {activeRecordForm && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-800 rounded-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto">
              <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center sticky top-0">
                <h3 className="text-lg font-bold text-orange-400">{editingRecordId ? '' : 'New '}{activeRecordForm}</h3>
                <button
                  onClick={() => {
                    setActiveRecordForm(null);
                    setCurrentRecordData({});
                    setEditingRecordId(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Common Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Officer Name</label>
                    <input
                      type="text"
                      value={currentRecordData.officer || ''}
                      onChange={(e) => setCurrentRecordData({...currentRecordData, officer: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Badge Number</label>
                    <input
                      type="text"
                      value={currentRecordData.badge || ''}
                      onChange={(e) => setCurrentRecordData({...currentRecordData, badge: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={currentRecordData.subject || ''}
                    onChange={(e) => setCurrentRecordData({...currentRecordData, subject: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    placeholder="Name of person this record is for"
                  />
                </div>

                {/* ARREST specific fields */}
                {activeRecordForm === 'ARREST' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Date of Arrest</label>
                        <input
                          type="datetime-local"
                          value={currentRecordData.arrestDate || ''}
                          onChange={(e) => setCurrentRecordData({...currentRecordData, arrestDate: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Location of Arrest</label>
                        <input
                          type="text"
                          value={currentRecordData.location || ''}
                          onChange={(e) => setCurrentRecordData({...currentRecordData, location: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Charges</label>
                      <textarea
                        value={currentRecordData.charges || ''}
                        onChange={(e) => setCurrentRecordData({...currentRecordData, charges: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
                        placeholder="List all charges..."
                      />
                    </div>
                  </>
                )}

                {/* BOLO specific fields */}
                {activeRecordForm === 'BOLO' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">BOLO Type</label>
                        <select
                          value={currentRecordData.boloType || ''}
                          onChange={(e) => setCurrentRecordData({...currentRecordData, boloType: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        >
                          <option value="">Select Type</option>
                          <option value="PERSON">Person</option>
                          <option value="VEHICLE">Vehicle</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Priority</label>
                        <select
                          value={currentRecordData.priority || ''}
                          onChange={(e) => setCurrentRecordData({...currentRecordData, priority: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        >
                          <option value="">Select Priority</option>
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Description</label>
                      <textarea
                        value={currentRecordData.description || ''}
                        onChange={(e) => setCurrentRecordData({...currentRecordData, description: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
                        placeholder="Detailed description of BOLO subject..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Last Known Location</label>
                      <input
                        type="text"
                        value={currentRecordData.lastLocation || ''}
                        onChange={(e) => setCurrentRecordData({...currentRecordData, lastLocation: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      />
                    </div>
                  </>
                )}

                {/* WARRANT specific fields */}
                {activeRecordForm === 'WARRANT' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Warrant Type</label>
                        <select
                          value={currentRecordData.warrantType || ''}
                          onChange={(e) => setCurrentRecordData({...currentRecordData, warrantType: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        >
                          <option value="">Select Type</option>
                          <option value="ARREST">Arrest Warrant</option>
                          <option value="SEARCH">Search Warrant</option>
                          <option value="BENCH">Bench Warrant</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Issuing Court</label>
                        <input
                          type="text"
                          value={currentRecordData.issuingCourt || ''}
                          onChange={(e) => setCurrentRecordData({...currentRecordData, issuingCourt: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Charges/Reason</label>
                      <textarea
                        value={currentRecordData.charges || ''}
                        onChange={(e) => setCurrentRecordData({...currentRecordData, charges: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
                        placeholder="Charges or reason for warrant..."
                      />
                    </div>
                  </>
                )}

                {/* CITATION specific fields */}
                {activeRecordForm === 'CITATION' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Citation Type</label>
                        <select
                          value={currentRecordData.citationType || ''}
                          onChange={(e) => setCurrentRecordData({...currentRecordData, citationType: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        >
                          <option value="">Select Type</option>
                          <option value="TRAFFIC">Traffic</option>
                          <option value="PARKING">Parking</option>
                          <option value="MUNICIPAL">Municipal Code</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Fine Amount</label>
                        <input
                          type="text"
                          value={currentRecordData.fineAmount || ''}
                          onChange={(e) => setCurrentRecordData({...currentRecordData, fineAmount: e.target.value})}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                          placeholder="$0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Violation</label>
                      <textarea
                        value={currentRecordData.violation || ''}
                        onChange={(e) => setCurrentRecordData({...currentRecordData, violation: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
                        placeholder="Description of violation..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Location</label>
                      <input
                        type="text"
                        value={currentRecordData.location || ''}
                        onChange={(e) => setCurrentRecordData({...currentRecordData, location: e.target.value})}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Additional Notes</label>
                  <textarea
                    value={currentRecordData.notes || ''}
                    onChange={(e) => setCurrentRecordData({...currentRecordData, notes: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setActiveRecordForm(null);
                      setCurrentRecordData({});
                      setEditingRecordId(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveRecord}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-500"
                  >
                    {editingRecordId ? 'Save' : 'Add Record'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );

  // Lookup Panel functions
  const handleLookupPersonSearch = (query: string) => {
    setLookupSearchQuery(query);
    if (query.trim().length > 0) {
      const results = civilians.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
      );
      setLookupSearchResults(results);
    } else {
      setLookupSearchResults([]);
    }
  };

  const handleLookupVehicleSearch = (query: string) => {
    setLookupVehicleQuery(query);
    if (query.trim().length > 0) {
      const results: any[] = [];
      civilians.forEach(civilian => {
        civilian.dmvRecords?.forEach((record: any) => {
          if (record.type === 'VEHICLE REGISTRATION' &&
              record.data?.plateNumber?.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              ...record.data,
              ownerName: `${civilian.firstName} ${civilian.lastName}`,
              ownerId: civilian.id,
              ownerData: civilian
            });
          }
        });
      });
      setLookupVehicleResults(results);
    } else {
      setLookupVehicleResults([]);
    }
  };

  const selectLookupPerson = (person: any) => {
    setSelectedLookupPerson(person);
    setLookupSearchResults([]);
    setLookupSearchQuery('');
  };

  const selectLookupVehicle = (vehicle: any) => {
    // When selecting a vehicle, show the owner's full profile
    setSelectedLookupPerson(vehicle.ownerData);
    setLookupVehicleResults([]);
    setLookupVehicleQuery('');
  };

  // Lookup Panel JSX
  const lookupPanelJSX = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
            <Search size={24} />
            Person & Vehicle Lookup
          </h2>
          <button
            onClick={() => {
              setActiveRecordsPanel(null);
              setSelectedLookupPerson(null);
              setLookupSearchQuery('');
              setLookupSearchResults([]);
              setLookupVehicleQuery('');
              setLookupVehicleResults([]);
            }}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search Section */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Person Search */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <User size={18} />
                Search by Name
              </h3>
              <div className="relative">
                <input
                  type="text"
                  value={lookupSearchQuery}
                  onChange={(e) => handleLookupPersonSearch(e.target.value)}
                  placeholder="Enter name to search..."
                  className="w-full bg-gray-800 text-white rounded px-3 py-2 pr-10"
                />
                <Search size={18} className="absolute right-3 top-2.5 text-gray-400" />
              </div>
              {lookupSearchResults.length > 0 && (
                <div className="mt-2 bg-gray-800 rounded max-h-48 overflow-y-auto">
                  {lookupSearchResults.map((person: any) => (
                    <button
                      key={person.id}
                      onClick={() => selectLookupPerson(person)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-600 text-white border-b border-gray-700 last:border-0"
                    >
                      <div className="font-semibold">{person.firstName} {person.lastName}</div>
                      <div className="text-sm text-gray-400">DOB: {person.dob}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Search */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Car size={18} />
                Search by Plate
              </h3>
              <div className="relative">
                <input
                  type="text"
                  value={lookupVehicleQuery}
                  onChange={(e) => handleLookupVehicleSearch(e.target.value)}
                  placeholder="Enter plate number..."
                  className="w-full bg-gray-800 text-white rounded px-3 py-2 pr-10"
                />
                <Search size={18} className="absolute right-3 top-2.5 text-gray-400" />
              </div>
              {lookupVehicleResults.length > 0 && (
                <div className="mt-2 bg-gray-800 rounded max-h-48 overflow-y-auto">
                  {lookupVehicleResults.map((vehicle: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => selectLookupVehicle(vehicle)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-600 text-white border-b border-gray-700 last:border-0"
                    >
                      <div className="font-semibold">{vehicle.plateNumber}</div>
                      <div className="text-sm text-gray-400">
                        {vehicle.year} {vehicle.color} {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-sm text-blue-400">Owner: {vehicle.ownerName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Person Results */}
          {selectedLookupPerson && (
            <div className="space-y-4">
              {/* Person Info Card */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white">
                    {selectedLookupPerson.firstName} {selectedLookupPerson.lastName}
                  </h3>
                  <button
                    onClick={() => setSelectedLookupPerson(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Date of Birth:</span>
                    <span className="text-white ml-2">{selectedLookupPerson.dob}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Gender:</span>
                    <span className="text-white ml-2">{selectedLookupPerson.gender}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>
                    <span className="text-white ml-2">{selectedLookupPerson.phone || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Address:</span>
                    <span className="text-white ml-2">{selectedLookupPerson.address || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Occupation:</span>
                    <span className="text-white ml-2">{selectedLookupPerson.occupation || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* DMV Records */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  DMV Records ({selectedLookupPerson.dmvRecords?.length || 0})
                </h3>

                {selectedLookupPerson.dmvRecords && selectedLookupPerson.dmvRecords.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedLookupPerson.dmvRecords.map((record: any, idx: number) => (
                      <div key={idx} className={`bg-gray-800 rounded-lg p-4 border-l-4 ${
                        record.type === 'VEHICLE REGISTRATION' ? 'border-blue-500' :
                        record.type === 'LICENSE' ? 'border-green-500' :
                        record.type === 'REGISTERED FIREARM' ? 'border-red-500' :
                        record.type === 'OUT OF STATE WARRANT' ? 'border-red-600' :
                        record.type === 'PROBATION' || record.type === 'PAROLE' ? 'border-orange-500' :
                        record.type === 'MEDICAL HAZARD' ? 'border-yellow-500' :
                        'border-gray-500'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-1 rounded text-sm font-semibold ${
                            record.type === 'VEHICLE REGISTRATION' ? 'bg-blue-600 text-white' :
                            record.type === 'LICENSE' ? 'bg-green-600 text-white' :
                            record.type === 'REGISTERED FIREARM' ? 'bg-red-600 text-white' :
                            record.type === 'OUT OF STATE WARRANT' ? 'bg-red-700 text-white' :
                            record.type === 'PROBATION' || record.type === 'PAROLE' ? 'bg-orange-600 text-white' :
                            record.type === 'MEDICAL HAZARD' ? 'bg-yellow-600 text-black' :
                            'bg-gray-600 text-white'
                          }`}>
                            {record.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Record-specific data display */}
                        <div className="text-sm space-y-1">
                          {record.type === 'VEHICLE REGISTRATION' && record.data && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-gray-400">Plate:</span> <span className="text-white font-mono">{record.data.plateNumber}</span></div>
                                <div><span className="text-gray-400">VIN:</span> <span className="text-white font-mono">{record.data.vin}</span></div>
                                <div><span className="text-gray-400">Make:</span> <span className="text-white">{record.data.make}</span></div>
                                <div><span className="text-gray-400">Model:</span> <span className="text-white">{record.data.model}</span></div>
                                <div><span className="text-gray-400">Year:</span> <span className="text-white">{record.data.year}</span></div>
                                <div><span className="text-gray-400">Color:</span> <span className="text-white">{record.data.color}</span></div>
                                <div><span className="text-gray-400">Type:</span> <span className="text-white">{record.data.vehicleType}</span></div>
                                <div>
                                  <span className="text-gray-400">Registration:</span>{' '}
                                  <span className={record.data.registrationStatus === 'VALID' ? 'text-green-400' : 'text-red-400'}>
                                    {record.data.registrationStatus}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Insurance:</span>{' '}
                                  <span className={record.data.insuranceStatus === 'VALID' ? 'text-green-400' : 'text-red-400'}>
                                    {record.data.insuranceStatus}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}

                          {record.type === 'LICENSE' && record.data && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-gray-400">License #:</span> <span className="text-white font-mono">{record.data.licenseNumber}</span></div>
                                <div><span className="text-gray-400">Type:</span> <span className="text-white">{record.data.licenseType}</span></div>
                                <div>
                                  <span className="text-gray-400">Status:</span>{' '}
                                  <span className={record.data.status === 'VALID' ? 'text-green-400' : 'text-red-400'}>
                                    {record.data.status}
                                  </span>
                                </div>
                                <div><span className="text-gray-400">Expires:</span> <span className="text-white">{record.data.expirationDate}</span></div>
                              </div>
                            </>
                          )}

                          {record.type === 'REGISTERED FIREARM' && record.data && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-gray-400">Make:</span> <span className="text-white">{record.data.make}</span></div>
                                <div><span className="text-gray-400">Model:</span> <span className="text-white">{record.data.model}</span></div>
                                <div><span className="text-gray-400">Caliber:</span> <span className="text-white">{record.data.caliber}</span></div>
                                <div><span className="text-gray-400">Serial #:</span> <span className="text-white font-mono">{record.data.serialNumber}</span></div>
                              </div>
                            </>
                          )}

                          {record.type === 'OUT OF STATE WARRANT' && record.data && (
                            <div className="bg-red-900 bg-opacity-50 rounded p-2 mt-2">
                              <div><span className="text-gray-300">State:</span> <span className="text-white">{record.data.state}</span></div>
                              <div><span className="text-gray-300">Charges:</span> <span className="text-white">{record.data.charges}</span></div>
                              <div><span className="text-gray-300">Extraditable:</span> <span className="text-white">{record.data.extraditable ? 'YES' : 'NO'}</span></div>
                            </div>
                          )}

                          {(record.type === 'PROBATION' || record.type === 'PAROLE') && record.data && (
                            <div className="bg-orange-900 bg-opacity-50 rounded p-2 mt-2">
                              <div><span className="text-gray-300">Start Date:</span> <span className="text-white">{record.data.startDate}</span></div>
                              <div><span className="text-gray-300">End Date:</span> <span className="text-white">{record.data.endDate}</span></div>
                              <div><span className="text-gray-300">Officer:</span> <span className="text-white">{record.data.officer}</span></div>
                              {record.data.conditions && <div><span className="text-gray-300">Conditions:</span> <span className="text-white">{record.data.conditions}</span></div>}
                            </div>
                          )}

                          {record.type === 'MEDICAL HAZARD' && record.data && (
                            <div className="bg-yellow-900 bg-opacity-50 rounded p-2 mt-2">
                              <div><span className="text-gray-300">Type:</span> <span className="text-white">{record.data.hazardType}</span></div>
                              {record.data.notes && <div><span className="text-gray-300">Notes:</span> <span className="text-white">{record.data.notes}</span></div>}
                            </div>
                          )}

                          {record.type === 'MEDICAL HISTORY' && record.data && (
                            <div className="bg-gray-900 rounded p-2 mt-2">
                              {record.data.conditions && <div><span className="text-gray-300">Conditions:</span> <span className="text-white">{record.data.conditions}</span></div>}
                              {record.data.allergies && <div><span className="text-gray-300">Allergies:</span> <span className="text-white">{record.data.allergies}</span></div>}
                              {record.data.medications && <div><span className="text-gray-300">Medications:</span> <span className="text-white">{record.data.medications}</span></div>}
                            </div>
                          )}

                          {record.type === 'SECURITY GUARD LICENSE' && record.data && (
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="text-gray-400">License #:</span> <span className="text-white font-mono">{record.data.licenseNumber}</span></div>
                              <div><span className="text-gray-400">Employer:</span> <span className="text-white">{record.data.employer}</span></div>
                              <div><span className="text-gray-400">Armed:</span> <span className="text-white">{record.data.armed ? 'YES' : 'NO'}</span></div>
                              <div><span className="text-gray-400">Expires:</span> <span className="text-white">{record.data.expirationDate}</span></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded p-4 text-center text-gray-400">
                    No DMV records found for this person
                  </div>
                )}
              </div>

              {/* Police Records for this person */}
              {officerRecords.filter(r =>
                r.suspectName?.toLowerCase().includes(`${selectedLookupPerson.firstName} ${selectedLookupPerson.lastName}`.toLowerCase())
              ).length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Police Records
                  </h3>
                  <div className="space-y-2">
                    {officerRecords.filter(r =>
                      r.suspectName?.toLowerCase().includes(`${selectedLookupPerson.firstName} ${selectedLookupPerson.lastName}`.toLowerCase())
                    ).map((record: any) => (
                      <div key={record.id} className={`bg-gray-800 rounded p-3 border-l-4 ${
                        record.type === 'ARREST' ? 'border-red-500' :
                        record.type === 'WARRANT' ? 'border-orange-500' :
                        record.type === 'BOLO' ? 'border-yellow-500' :
                        'border-blue-500'
                      }`}>
                        <div className="flex justify-between">
                          <span className="font-semibold text-white">{record.type}</span>
                          <span className="text-xs text-gray-400">{record.id}</span>
                        </div>
                        {record.charges && <div className="text-sm text-gray-300 mt-1">Charges: {record.charges}</div>}
                        {record.description && <div className="text-sm text-gray-300 mt-1">{record.description}</div>}
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(record.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No selection message */}
          {!selectedLookupPerson && lookupSearchResults.length === 0 && lookupVehicleResults.length === 0 && (
            <div className="bg-gray-700 rounded-lg p-8 text-center">
              <Search size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">Search for a person by name or vehicle by plate number</p>
              <p className="text-gray-500 text-sm mt-2">Results will display DMV records, licenses, and any police records</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
    // Combine closed calls from main calls list with unit's own call history (includes unassigned calls)
    const closedCalls = calls.filter(c => c.assignedUnits.includes(myUnit.id) && c.status === 'CLOSED');
    const unitCallHistory = myUnit.callHistory || [];
    // Merge both sources, avoiding duplicates based on callId
    const allHistory = [
      ...closedCalls.map(c => ({ ...c, historyType: 'CLOSED' })),
      ...unitCallHistory.filter(h => !closedCalls.some(c => c.id === h.callId))
    ];

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

              {/* Other Assigned Units */}
              {units.filter(u => activeCall.assignedUnits.includes(u.id) && u.id !== myUnit.id).length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Other Units on Call</div>
                  <div className="flex flex-wrap gap-2">
                    {units.filter(u => activeCall.assignedUnits.includes(u.id) && u.id !== myUnit.id).map(u => (
                      <span key={u.id} className="bg-gray-800 text-white px-3 py-1 rounded text-sm">
                        {u.callsign}
                        {activeCall.primaryUnit === u.id && (
                          <span className="ml-2 text-yellow-400 text-xs">(PRIMARY)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Call Notes Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <FileText size={16} />
                  Notes ({activeCall.callNotes?.length || 0})
                </div>
                {activeCall.callNotes && activeCall.callNotes.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                    {activeCall.callNotes.map((note, idx) => (
                      <div key={idx} className="bg-gray-800 rounded p-2">
                        <div className="text-xs text-gray-400 mb-1">
                          {formatPSTDateTime(note.timestamp)}
                        </div>
                        <div className="text-white text-sm whitespace-pre-wrap">{note.text}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm mb-3">No notes yet</div>
                )}
                {/* Add Note Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a note..."
                    className="flex-1 bg-gray-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      const target = e.target as HTMLInputElement;
                      if (e.key === 'Enter' && target.value.trim()) {
                        addNote(activeCall.id, target.value);
                        target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const button = e.target as HTMLButtonElement;
                      const input = button.previousElementSibling as HTMLInputElement;
                      if (input?.value?.trim()) {
                        addNote(activeCall.id, input.value);
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
                  >
                    Add
                  </button>
                </div>
              </div>
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
            Call History ({allHistory.length})
          </h3>

          {allHistory.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allHistory.map((entry, idx) => {
                // Check if it's a full call object or a history entry
                const isFullCall = entry.historyType === 'CLOSED';
                const callId = isFullCall ? entry.id : entry.callId;
                const code = entry.code;
                const address = entry.address;
                const timestamp = entry.timestamp;
                const status = isFullCall ? 'CLOSED' : entry.status;
                const role = entry.role;

                // Find the full call in the system (works for both closed and unassigned)
                const fullCall = isFullCall ? entry : calls.find(c => c.id === callId);
                const canOpen = !!fullCall;

                return (
                  <div
                    key={`${callId}-${idx}`}
                    onClick={() => canOpen && setSelectedCall(fullCall)}
                    className={`bg-gray-700 rounded-lg p-4 border-l-4 transition ${
                      canOpen ? 'cursor-pointer hover:bg-gray-600' : ''
                    } ${
                      status === 'CLOSED' ? 'border-green-600' :
                      status === 'UNASSIGNED' ? 'border-orange-600' : 'border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between mb-2">
                      <div className="flex gap-2 flex-wrap items-center">
                        <span className="font-mono text-gray-400">{callId}</span>
                        <span className="text-white font-semibold">{code}</span>
                        {role && (
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            role === 'PRIMARY' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'
                          }`}>
                            {role}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-sm ${
                          status === 'CLOSED' ? 'bg-green-700 text-white' :
                          status === 'UNASSIGNED' ? 'bg-orange-700 text-white' : 'bg-gray-600 text-white'
                        }`}>
                          {status}
                        </span>
                        {canOpen && (
                          <span className="text-blue-400 text-xs">Click to view</span>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm">{formatPSTDate(timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin size={16} />
                      <span>{address}</span>
                    </div>
                    {entry.unassignedAt && (
                      <div className="text-xs text-orange-400 mt-1">
                        Unassigned: {formatPSTDateTime(entry.unassignedAt)}
                      </div>
                    )}
                  </div>
                );
              })}
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
                <select 
                  value={data.callOrigin} 
                  onChange={(e) => setData({...data, callOrigin: e.target.value})} 
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 cursor-pointer"
                >
                  <option value="CALLER">CALLER</option>
                  <option value="RADIO DISPATCH">RADIO DISPATCH</option>
                  <option value="OBSERVED">OBSERVED</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Priority</label>
                <select 
                  value={data.priority} 
                  onChange={(e) => setData({...data, priority: e.target.value})} 
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 cursor-pointer"
                >
                  <option value="1">Priority 1 (High)</option>
                  <option value="2">Priority 2 (Medium)</option>
                  <option value="3">Priority 3 (Low)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Type</label>
                <select 
                  value={data.callTitle} 
                  onChange={(e) => setData({...data, callTitle: e.target.value})} 
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 cursor-pointer"
                >
                  <option value="LE">LE</option>
                  <option value="FD">FD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Code</label>
                <select 
                  value={data.code} 
                  onChange={(e) => setData({...data, code: e.target.value})} 
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 cursor-pointer"
                >
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

  const CallDetail = ({ call: initialCall }) => {
    const [note, setNote] = useState('');
    const [pasteContent, setPasteContent] = useState('');
    const [showPasteModal, setShowPasteModal] = useState(false);

    // Get live call data from state so it updates in real-time
    const call = calls.find(c => c.id === initialCall.id) || initialCall;
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
                    <div key={u.id} className="bg-gray-800 rounded p-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold">{u.callsign}</span>
                        {call.primaryUnit === u.id && (
                          <span className="bg-yellow-600 text-white px-2 py-0.5 rounded text-xs">PRIMARY</span>
                        )}
                      </div>
                      {selectedRole === 'dispatch' && call.status !== 'CLOSED' && (
                        <div className="flex gap-1">
                          {call.primaryUnit !== u.id && (
                            <button onClick={() => setPrimary(call.id, u.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-500">Primary</button>
                          )}
                          <button
                            onClick={() => unassignUnit(call.id, u.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-500"
                          >
                            Unassign
                          </button>
                        </div>
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
              <select 
                value={info.department} 
                onChange={(e) => setInfo({...info, department: e.target.value})} 
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 cursor-pointer"
              >
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
      <header className="bg-gradient-to-r from-green-900 to-green-800 border-b-4 border-green-500 p-4">
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

        {selectedRole === 'fire' && selectedUnit && loggedInOfficer && (
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            <button
              className="px-4 py-2 bg-red-600 text-white rounded font-bold flex items-center gap-2 border-r-2 border-gray-600 mr-2"
            >
              <div className="text-left">
                <div className="text-sm font-bold">{loggedInOfficer.unitId}</div>
                <div className="text-xs">
                  <User size={12} className="inline mr-1" />
                  {loggedInOfficer.displayName}
                </div>
              </div>
            </button>
            <button
              onClick={() => updateUnitStatus(selectedUnit, 'available')}
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              Available
            </button>
            <button
              onClick={() => updateUnitStatus(selectedUnit, 'enroute')}
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              Enroute
            </button>
            <button
              onClick={() => updateUnitStatus(selectedUnit, 'onscene')}
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              On-Scene
            </button>
            <button
              onClick={() => updateUnitStatus(selectedUnit, 'busy')}
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              At Hospital
            </button>
          </div>
        )}

        {selectedRole === 'tow' && loggedInOfficer && (
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            <button
              className="px-4 py-2 bg-orange-600 text-white rounded font-bold flex items-center gap-2 border-r-2 border-gray-600 mr-2"
            >
              <div className="text-left">
                <div className="text-sm font-bold">{loggedInOfficer.unitId}</div>
                <div className="text-xs">
                  <User size={12} className="inline mr-1" />
                  {loggedInOfficer.displayName}
                </div>
              </div>
            </button>
            <button
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              Available
            </button>
            <button
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              Enroute
            </button>
            <button
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              On-Scene
            </button>
            <button
              className="px-4 py-2 rounded font-semibold transition bg-gray-700 text-white hover:bg-gray-600"
            >
              Towing
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
                <button onClick={() => setActiveTab('tow')} className={`px-4 py-2 rounded ${activeTab === 'tow' ? 'bg-blue-600' : 'bg-gray-700'}`}>Tow</button>
                <button onClick={() => setActiveTab('fire-ems')} className={`px-4 py-2 rounded ${activeTab === 'fire-ems' ? 'bg-blue-600' : 'bg-gray-700'}`}>Fire/EMS</button>
              </>
            )}
            {selectedRole === 'police' && (
              <button className="px-4 py-2 rounded bg-blue-600">My Unit</button>
            )}
            {selectedRole === 'fire' && (
              <button className="px-4 py-2 rounded bg-red-600">My Unit</button>
            )}
            {selectedRole === 'tow' && (
              <button className="px-4 py-2 rounded bg-orange-600">My Unit</button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 pb-20">
        {selectedRole === 'police' && <UnitViewMode />}
        {selectedRole === 'fire' && <UnitViewMode />}
        {selectedRole === 'tow' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">My Tow Truck</h2>
            <div className="bg-gray-800 rounded-lg p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-orange-400">{loggedInOfficer?.displayName}</h3>
                  <p className="text-gray-400">{loggedInOfficer?.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Unit ID</p>
                  <p className="text-lg font-bold text-white">{loggedInOfficer?.unitId}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Active Tow Requests</h3>
              <p className="text-gray-400 text-center py-8">No active tow requests assigned to you</p>
            </div>
          </div>
        )}

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

        {selectedRole === 'dispatch' && activeTab === 'tow' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Tow Management</h2>

            <div className="bg-gray-800 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold mb-4">Active Tow Requests</h3>
              <p className="text-gray-400 text-center py-8">No active tow requests</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Available Tow Trucks</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-700 rounded p-4 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold">TOW-1</h4>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-sm text-gray-400">Driver: Mike's Towing</div>
                  <div className="text-sm text-green-400 font-semibold">Available</div>
                </div>
                <div className="bg-gray-700 rounded p-4 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold">TOW-2</h4>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-sm text-gray-400">Driver: Quick Tow</div>
                  <div className="text-sm text-green-400 font-semibold">Available</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedRole === 'dispatch' && activeTab === 'fire-ems' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Fire/EMS Management</h2>

            <div className="bg-gray-800 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold mb-4">Active Fire/EMS Calls</h3>
              <p className="text-gray-400 text-center py-8">No active fire/EMS calls</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Available Units</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-700 rounded p-4 border-l-4 border-red-500">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold">ENGINE-1</h4>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-sm text-gray-400">Station 1</div>
                  <div className="text-sm text-green-400 font-semibold">Available</div>
                </div>
                <div className="bg-gray-700 rounded p-4 border-l-4 border-red-500">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold">MEDIC-1</h4>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-sm text-gray-400">EMS Station 1</div>
                  <div className="text-sm text-green-400 font-semibold">Available</div>
                </div>
                <div className="bg-gray-700 rounded p-4 border-l-4 border-red-500">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold">LADDER-1</h4>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-sm text-gray-400">Station 1</div>
                  <div className="text-sm text-green-400 font-semibold">Available</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 border-t border-gray-700 p-4 fixed bottom-0 left-0 right-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="bg-gray-700 p-1 rounded hover:bg-gray-600 transition"
              title={selectedRole === 'police' && loggedInOfficer ? loggedInOfficer.displayName : selectedRole === 'dispatch' ? 'Dispatch' : 'Menu'}
            >
              <img
                src="/SLRPLogo.png"
                alt="SLRP Menu"
                className="w-12 h-12 rounded"
              />
            </button>

            {/* Pinned Records Buttons - Only show for Police role */}
            {selectedRole === 'police' && (
              <>
                {pinnedRecordsButtons.lookup && (
                  <button
                    onClick={() => setActiveRecordsPanel('lookup')}
                    className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded flex items-center gap-2 text-white transition"
                  >
                    <Search size={18} />
                    <span className="font-semibold">Lookup</span>
                  </button>
                )}
                {pinnedRecordsButtons.records && (
                  <button
                    onClick={() => setActiveRecordsPanel('records')}
                    className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded flex items-center gap-2 text-white transition"
                  >
                    <FileText size={18} />
                    <span className="font-semibold">Records</span>
                  </button>
                )}
                {pinnedRecordsButtons.bolo && (
                  <button
                    onClick={() => setActiveRecordsPanel('bolo')}
                    className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded flex items-center gap-2 text-white transition"
                  >
                    <AlertTriangle size={18} />
                    <span className="font-semibold">BOLO</span>
                  </button>
                )}
              </>
            )}
          </div>
          <div className="bg-gray-700 px-4 py-2 rounded">
            <div className="text-gray-400 text-xs">Current Time (PST)</div>
            <div className="text-white font-mono text-lg">
              {currentTime.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: '2-digit', day: '2-digit', year: 'numeric' })} {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour12: true })}
            </div>
          </div>
        </div>
      </footer>

      {showRoleMenu && <RoleMenu />}
      {showRecordsMenu && <RecordsManagementMenu />}
      {activeRecordsPanel === 'records' && recordsPanelJSX}
      {activeRecordsPanel === 'lookup' && lookupPanelJSX}
      {showExportImport && <ExportImportModal />}
      {showNewCall && <NewCallForm />}
      {selectedCall && <CallDetail call={selectedCall} />}
      {showUnitInfo && selectedUnit && <UnitInfoModal unit={units.find(u => u.id === selectedUnit)} />}
    </div>
  );
};

export default CADSystem;
