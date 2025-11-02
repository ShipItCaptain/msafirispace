import React, { createContext, useContext, useReducer, useEffect } from 'react';

const BnBListingsContext = createContext();

const listingsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LISTINGS':
      return action.payload;
    case 'ADD_LISTING':
      return [action.payload, ...state];
    case 'UPDATE_LISTING':
      return state.map(listing => 
        listing.id === action.payload.id ? { ...listing, ...action.payload } : listing
      );
    case 'DELETE_LISTING':
      return state.filter(listing => listing.id !== action.payload);
    case 'LOAD_FROM_STORAGE':
      return action.payload || [];
    default:
      return state;
  }
};

export const BnBListingsProvider = ({ children }) => {
  const [listings, dispatch] = useReducer(listingsReducer, []);

  // Load listings from localStorage on mount
  useEffect(() => {
    const savedListings = localStorage.getItem('bnbListings');
    if (savedListings) {
      try {
        const parsedListings = JSON.parse(savedListings);
        dispatch({ type: 'LOAD_FROM_STORAGE', payload: parsedListings });
      } catch (error) {
        console.error('Error loading listings from localStorage:', error);
      }
    } else {
      // Initialize with mock data if no saved data
      const mockListings = [
        {
          id: 1,
          title: 'Cozy Downtown Apartment',
          description: 'A beautiful, modern apartment in the heart of downtown Nairobi. Perfect for business travelers and tourists alike. Features stunning city views, fully equipped kitchen, and high-speed WiFi.',
          propertyType: 'apartment',
          location: 'Nairobi, Kenya',
          address: '123 Kenyatta Avenue, Nairobi',
          city: 'Nairobi',
          country: 'Kenya',
          price: 4500,
          pricePerNight: 4500,
          cleaningFee: 500,
          securityDeposit: 2000,
          minimumNights: 1,
          maximumNights: 30,
          checkInTime: '15:00',
          checkOutTime: '11:00',
          bedrooms: 2,
          bathrooms: 1,
          guests: 4,
          beds: 2,
          squareFootage: 1200,
          yearBuilt: 2020,
          amenities: ['WiFi', 'Kitchen', 'Parking', 'Pool', 'Air conditioning', 'TV', 'Washer', 'Dryer'],
          houseRules: ['No smoking', 'No parties or events', 'No pets', 'Check-in after 3 PM only'],
          smokingAllowed: false,
          petsAllowed: false,
          partiesAllowed: false,
          childrenAllowed: true,
          images: ['/api/placeholder/800/600', '/api/placeholder/800/600', '/api/placeholder/800/600'],
          photos: ['/api/placeholder/800/600', '/api/placeholder/800/600', '/api/placeholder/800/600'],
          hostName: 'John Doe',
          hostPhone: '+254 700 123 456',
          hostEmail: 'john@example.com',
          emergencyContact: '+254 700 987 654',
          highlights: ['City center location', 'Modern amenities', '24/7 security'],
          nearbyAttractions: 'Nairobi National Park, Kenyatta International Conference Centre, Westgate Shopping Mall',
          transportation: 'Easy access to public transport, Uber available, Airport shuttle service',
          specialInstructions: 'Please ring the doorbell twice. Key will be left with security.',
          status: 'active',
          bookings: 12,
          revenue: 54000,
          rating: 4.8,
          reviews: 24,
          created_at: '2024-01-15',
          last_booking: '2024-01-20'
        },
        {
          id: 2,
          title: 'Luxury Beach Villa',
          description: 'Stunning beachfront villa with panoramic ocean views. Perfect for families and groups looking for a luxurious getaway.',
          propertyType: 'villa',
          location: 'Mombasa, Kenya',
          address: '456 Beach Road, Mombasa',
          city: 'Mombasa',
          country: 'Kenya',
          price: 12000,
          pricePerNight: 12000,
          cleaningFee: 1000,
          securityDeposit: 5000,
          minimumNights: 2,
          maximumNights: 30,
          checkInTime: '15:00',
          checkOutTime: '11:00',
          bedrooms: 4,
          bathrooms: 3,
          guests: 8,
          beds: 4,
          squareFootage: 2500,
          yearBuilt: 2019,
          amenities: ['WiFi', 'Kitchen', 'Parking', 'Pool', 'Beach Access', 'Air conditioning', 'TV', 'Washer', 'Dryer'],
          houseRules: ['No smoking', 'No parties or events', 'No pets', 'Check-in after 3 PM only'],
          smokingAllowed: false,
          petsAllowed: false,
          partiesAllowed: false,
          childrenAllowed: true,
          images: ['/api/placeholder/800/600', '/api/placeholder/800/600', '/api/placeholder/800/600'],
          photos: ['/api/placeholder/800/600', '/api/placeholder/800/600', '/api/placeholder/800/600'],
          hostName: 'Jane Smith',
          hostPhone: '+254 700 234 567',
          hostEmail: 'jane@example.com',
          emergencyContact: '+254 700 876 543',
          highlights: ['Beachfront location', 'Private pool', 'Luxury amenities'],
          nearbyAttractions: 'Fort Jesus, Mombasa Old Town, Haller Park',
          transportation: 'Airport shuttle available, Car rental nearby',
          specialInstructions: 'Gate code will be provided 24 hours before check-in.',
          status: 'active',
          bookings: 8,
          revenue: 96000,
          rating: 4.9,
          reviews: 18,
          created_at: '2024-01-10',
          last_booking: '2024-01-18'
        }
      ];
      dispatch({ type: 'SET_LISTINGS', payload: mockListings });
    }
  }, []);

  // Save listings to localStorage whenever listings change
  useEffect(() => {
    if (listings.length > 0) {
      localStorage.setItem('bnbListings', JSON.stringify(listings));
    }
  }, [listings]);

  const addListing = (listing) => {
    dispatch({ type: 'ADD_LISTING', payload: listing });
  };

  const updateListing = (listing) => {
    dispatch({ type: 'UPDATE_LISTING', payload: listing });
  };

  const deleteListing = (id) => {
    dispatch({ type: 'DELETE_LISTING', payload: id });
  };

  const getListingById = (id) => {
    return listings.find(listing => listing.id === parseInt(id));
  };

  const setListings = (newListings) => {
    dispatch({ type: 'SET_LISTINGS', payload: newListings });
  };

  const value = {
    listings,
    addListing,
    updateListing,
    deleteListing,
    getListingById,
    setListings
  };

  return (
    <BnBListingsContext.Provider value={value}>
      {children}
    </BnBListingsContext.Provider>
  );
};

export const useBnBListings = () => {
  const context = useContext(BnBListingsContext);
  if (!context) {
    throw new Error('useBnBListings must be used within a BnBListingsProvider');
  }
  return context;
};
