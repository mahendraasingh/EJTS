export type UserRole = 'ADMIN' | 'SECURITY_ANALYST' | 'VIEWER';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export type AssetType = 'Server' | 'Workstation' | 'Database' | 'Network Device' | 'Web Application' | 'Cloud Instance' | 'Container';
export type Environment = 'Production' | 'Staging' | 'Development' | 'Testing';
export type BusinessCriticality = 'Critical' | 'High' | 'Medium' | 'Low';
export type InternetExposure = 'Internet Facing' | 'Internal' | 'Isolated';

export interface Asset {
  id: number;
  asset_id: string;
  name: string;
  ip_address: string;
  operating_system: string;
  asset_type: AssetType;
  environment: Environment;
  business_criticality: BusinessCriticality;
  internet_exposure: InternetExposure;
  owner: string;
  department: string;
  location: string;
  vulnerability_count?: number;
  created_at: string;
  updated_at: string;
}

export type CVSSSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type RiskPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type RemediationStatus = 'Open' | 'In Progress' | 'Pending Verification' | 'Resolved' | 'Accepted Risk';

export interface Vulnerability {
  id: number;
  cve_id: string;
  title: string;
  description: string;
  cvss_score: number;
  cvss_severity: CVSSSeverity;
  cwe_id?: string;
  affected_software: string;
  affected_version: string;
  asset_id: number;
  epss_score: number;
  kev_status: boolean;
  exploit_available: boolean;
  discovery_date: string;
  last_updated_date: string;
  risk_score: number;
  risk_priority: RiskPriority;
  remediation_status: RemediationStatus;
  remediation_recommendation?: string;
  assigned_to_id?: number;
  created_at: string;
  updated_at: string;
  asset?: Asset;
  assigned_to?: User;
}

export interface RiskContributionItem {
  factor: string;
  raw_value: string;
  normalized_value: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface RiskBreakdown {
  vulnerability_id: number;
  cve_id: string;
  vulnerability_title: string;
  asset_name: string;
  scoring_version: string;
  calculated_at: string;
  cvss_score: number;
  cvss_normalized: number;
  cvss_contribution: number;
  epss_score: number;
  epss_normalized: number;
  epss_contribution: number;
  asset_criticality: string;
  asset_criticality_normalized: number;
  asset_criticality_contribution: number;
  internet_exposure: string;
  internet_exposure_normalized: number;
  internet_exposure_contribution: number;
  exploitation_status: string;
  exploitation_normalized: number;
  exploitation_contribution: number;
  environment: string;
  environment_normalized: number;
  environment_contribution: number;
  final_risk_score: number;
  risk_level: string;
  items: RiskContributionItem[];
}

export interface RemediationTask {
  id: number;
  task_id: string;
  vulnerability_id: number;
  asset_id: number;
  assigned_to_id?: number;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  due_date: string;
  status: RemediationStatus;
  created_at: string;
  completed_at?: string;
  cve_id?: string;
  vulnerability_title?: string;
  asset_name?: string;
  assigned_to?: User;
}

export interface NotificationItem {
  id: number;
  user_id?: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  change_metadata?: string;
  created_at: string;
}

export interface KPISummary {
  total_vulnerabilities: number;
  critical_vulnerabilities: number;
  high_vulnerabilities: number;
  medium_vulnerabilities: number;
  low_vulnerabilities: number;
  total_assets: number;
  open_vulnerabilities: number;
  remediated_vulnerabilities: number;
  average_risk_score: number;
}
