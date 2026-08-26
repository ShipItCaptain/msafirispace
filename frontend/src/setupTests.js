// Shared Jest environment setup for stable async React tests.
window.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
});
