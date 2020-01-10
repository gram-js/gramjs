import React, { FC } from '../../../../lib/teact';

import LeftHeader from './LeftHeader';
import ConnectionState from './ConnectionState';
import ChatList from './ChatList';

import './LeftColumn.scss';

const LeftColumn: FC = () => {
  return (
    <div id="LeftColumn">
      <LeftHeader />
      <ConnectionState />
      <ChatList />
    </div>
  );
};

export default LeftColumn;
