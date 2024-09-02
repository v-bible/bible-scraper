/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { getOrdinaryTime } from '@/catholic-resources/get-ordinary-time';
import { getOrdinaryTimeSunday } from '@/catholic-resources/get-ordinary-time-sunday';

(async () => {
  await getOrdinaryTime();
  await getOrdinaryTimeSunday();
})();
