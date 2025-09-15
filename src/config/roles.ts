const allRoles = {
  user: ['getVideos', 'getShorts', 'getCategories', 'getSubcategories', 'manageProfile', 'createFeedback', 'getAboutUs'],
  admin: ['getUsers', 'manageUsers', 'getVideos', 'manageVideos', 'getCategories', 'manageCategories', 'getSubcategories', 'manageSubcategories', 'getShorts', 'manageShorts', 'manageFeedback', 'getOverview', 'manageContent'],
};

export const roles = Object.keys(allRoles);
export const roleRights = new Map(Object.entries(allRoles));