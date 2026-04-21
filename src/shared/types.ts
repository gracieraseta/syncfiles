export type SyncDirection      = 'A_TO_B' | 'B_TO_A' | 'BIDIRECTIONAL'
export type SyncMode           = 'MANUAL' | 'SCHEDULED' | 'REALTIME'
export type EndpointType       = 'LOCAL' | 'NETWORK' | 'SFTP'
export type JobStatus          = 'PENDING' | 'RUNNING' | 'PAUSED' | 'DONE' | 'ERROR'
export type FileAction         = 'ADDED' | 'MODIFIED' | 'DELETED' | 'SKIPPED' | 'CONFLICT'
export type ConflictResolution = 'KEEP_LOCAL' | 'KEEP_REMOTE' | 'MERGE' | 'PENDING'

export interface FilterConfig {
  exclure:       string[]
  inclure:       string[]
  taille_max_mo: number | null
}

export interface SftpCredentials {
  host:        string
  port:        number
  username:    string
  password?:   string
  privateKey?: string
}

export interface Endpoint {
  id:          number
  type:        EndpointType
  chemin:      string
  credentials: SftpCredentials | null
  profile_id:  number
  role:        'SOURCE' | 'DESTINATION'
}

export interface SyncProfile {
  id:          number
  nom:         string
  sens:        SyncDirection
  mode:        SyncMode
  cron_expr:   string | null
  statut:      'ACTIVE' | 'PAUSED' | 'INACTIVE'
  user_id:     number
  source:      Endpoint
  destination: Endpoint
  filtres:     FilterConfig
}

export interface SyncJob {
  id:                number
  profile_id:        number
  date_debut:        string
  date_fin:          string | null
  statut:            JobStatus
  fichiers_total:    number
  fichiers_traites:  number
  fichiers_erreur:   number
  octets_transferes: number
}

export interface FileEvent {
  id:             number
  job_id:         number
  nom_fichier:    string
  chemin_relatif: string
  action:         FileAction
  checksum_avant: string | null
  checksum_apres: string | null
  taille:         number
  date_evenement: string
  erreur:         string | null
}

export interface Conflict {
  id:               number
  job_id:           number
  chemin_relatif:   string
  checksum_local:   string
  checksum_distant: string
  taille_local:     number
  taille_distant:   number
  date_local:       string
  date_distant:     string
  statut:           ConflictResolution
  date_detection:   string
}

export interface FileVersion {
  id:             number
  profile_id:     number
  chemin_relatif: string
  checksum:       string
  taille:         number
  date_version:   string
  chemin_backup:  string
}

export interface SyncProgressEvent {
  jobId:            number
  profileId:        number
  statut:           JobStatus
  fichiersCourant:  string
  progression:      number
  fichiersTraites:  number
  fichiersTotal:    number
  octetsTransferes: number
  vitesse:          number
}

export interface SyncResultEvent {
  jobId:            number
  profileId:        number
  statut:           JobStatus
  dureeMs:          number
  fichiersSynced:   number
  fichiersErreur:   number
  conflits:         number
  octetsTransferes: number
}

export interface EngineOptions {
  dbPath:             string
  versionsDir:        string
  maxVersions:        number
  checksumAlgo:       'md5' | 'sha256'
  compressionActif:   boolean
  bandwidthLimitKBps: number | null
}