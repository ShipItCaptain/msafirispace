import React, { useState } from 'react';
import { bnbAPI } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { houseRulesOptions } from '../../utils/bnbOptions';
import { SectionCard, SaveButton, ToggleChip, extractErrorMessage } from './shared';

const HouseRulesSection = ({ listing, onUpdated }) => {
  const { showSuccess, showError } = useNotifications();
  const [rules, setRules] = useState(listing.house_rules || []);
  const [policies, setPolicies] = useState({
    smoking_allowed: Boolean(listing.smoking_allowed),
    pets_allowed: Boolean(listing.pets_allowed),
    parties_allowed: Boolean(listing.parties_allowed),
    children_allowed: listing.children_allowed !== false,
  });
  const [saving, setSaving] = useState(false);

  const toggleRule = (rule) => {
    setRules((prev) => (prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await bnbAPI.update(listing.id, { house_rules: rules, ...policies });
      onUpdated(updated);
      showSuccess('Saved', 'House rules updated.', 4000);
    } catch (error) {
      showError('Save Failed', extractErrorMessage(error), 6000);
    } finally {
      setSaving(false);
    }
  };

  const policyLabels = {
    smoking_allowed: 'Smoking allowed',
    pets_allowed: 'Pets allowed',
    parties_allowed: 'Parties / events',
    children_allowed: 'Children welcome',
  };

  return (
    <SectionCard title="House rules" description="Set expectations before guests book.">
      <div className="flex flex-wrap gap-2 mb-6">
        {houseRulesOptions.map((rule) => (
          <ToggleChip key={rule} active={rules.includes(rule)} onClick={() => toggleRule(rule)}>
            {rule}
          </ToggleChip>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Policies</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(policyLabels).map(([key, label]) => (
            <ToggleChip
              key={key}
              active={policies[key]}
              onClick={() => setPolicies((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              {label}
            </ToggleChip>
          ))}
        </div>
      </div>
      <SaveButton onClick={handleSave} saving={saving} sticky />
    </SectionCard>
  );
};

export default HouseRulesSection;
