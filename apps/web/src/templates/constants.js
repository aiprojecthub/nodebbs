/**
 * Template component contract.
 * Single source of truth for all overridable component names.
 */

// View components — page-level presentation
export const VIEWS = {
  HomeView: 'HomeView',
  TopicView: 'TopicView',
  CategoryView: 'CategoryView',
  CategoriesView: 'CategoriesView',
  TagView: 'TagView',
  TagNotFoundView: 'TagNotFoundView',
  TagsView: 'TagsView',
  UserView: 'UserView',
  RankView: 'RankView',
  SearchView: 'SearchView',
};

// Layout components — structural wrappers
export const LAYOUTS = {
  AppLayout: 'AppLayout',
  PageLayout: 'PageLayout',
  SidebarLayout: 'SidebarLayout',
};

// Global components — appear on every page
export const GLOBALS = {
  Header: 'Header',
  Footer: 'Footer',
};

// All overridable component names (flat map)
export const COMPONENTS = { ...VIEWS, ...LAYOUTS, ...GLOBALS };
