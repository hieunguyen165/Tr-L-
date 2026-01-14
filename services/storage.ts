import { KeywordTrack, Project } from '../types';

const STORAGE_KEY_KEYWORDS = 'seo_rank_tracker_data';
const STORAGE_KEY_PROJECTS = 'seo_rank_tracker_projects';

// --- PROJECTS ---
export const saveProjects = (projects: Project[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error("Failed to save projects", e);
  }
};

export const loadProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PROJECTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load projects", e);
    return [];
  }
};

export const createNewProject = (name: string, domain: string): Project => {
  return {
    id: crypto.randomUUID(),
    name,
    domain,
    createdAt: Date.now()
  };
};

// --- KEYWORDS ---
export const saveKeywords = (keywords: KeywordTrack[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_KEYWORDS, JSON.stringify(keywords));
  } catch (e) {
    console.error("Failed to save keywords", e);
  }
};

export const loadKeywords = (): KeywordTrack[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_KEYWORDS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load keywords", e);
    return [];
  }
};

export const createNewKeyword = (keyword: string, domain: string, projectId: string): KeywordTrack => {
  return {
    id: crypto.randomUUID(),
    projectId,
    keyword,
    domain,
    currentRank: 0,
    lastChecked: null,
    history: [],
    isUpdating: false
  };
};