import React, { FC, memo } from '../lib/teact';

import './Spinner.scss';

const Spinner: FC<{ color?: 'blue' | 'white' | 'black' }> = ({ color = 'blue' }) => {
  return (
    <div className={`Spinner ${color}`} />
  );
};

export default memo(Spinner);
