import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { logger } from '@/logger/logger';

export type Checkpoint<T extends Record<string, unknown>> = {
  id: string;
  completed: boolean;
  params: T;
};

export type WithCheckpointOptions<T extends Record<string, unknown>> = {
  // NOTE: If true, will return all checkpoints regardless of completion
  // status
  forceAll?: boolean;
  // NOTE: If provided, will return only checkpoints with these ids
  forceCheckpointId?: Checkpoint<T>['id'][];
};

export type WithCheckpointParams<T extends Record<string, unknown>> = {
  getInitialData: () => Promise<T[]>;
  getCheckpointId: (item: T) => string;
  filterCheckpoint: (data: Checkpoint<T>) => boolean;
  sortCheckpoint?: (a: Checkpoint<T>, b: Checkpoint<T>) => number;
  filePath?: string;
  options?: WithCheckpointOptions<T>;
};

export type WithCheckpointReturn<T extends Record<string, unknown>> = {
  filteredCheckpoint: Checkpoint<T>[];
  getAllCheckpoint: () => Checkpoint<T>[];
  setCheckpointComplete: (
    checkpointId: Checkpoint<T>['id'],
    completed: Checkpoint<T>['completed'],
  ) => void;
};

const withCheckpoint = async <T extends Record<string, unknown>>({
  getInitialData,
  // NOTE: Function to set the checkpoint id based on the data
  getCheckpointId,
  filterCheckpoint,
  sortCheckpoint,
  filePath = path.join(__dirname, '../../', './checkpoint.json'),
  options,
}: WithCheckpointParams<T>): Promise<WithCheckpointReturn<T>> => {
  const { forceAll = false, forceCheckpointId = [] } = options || {};

  // NOTE: Open file to try to read, if not exists, create it with empty array
  try {
    const pathDir = path.dirname(filePath);

    // Ensure the directory exists
    if (!existsSync(pathDir)) {
      mkdirSync(pathDir, { recursive: true });
    }

    readFileSync(filePath, 'utf-8');
  } catch (error) {
    writeFileSync(filePath, '[]', 'utf-8');
  }

  const checkpointFileData = readFileSync(filePath, 'utf-8');

  let savedCheckpoint = JSON.parse(
    checkpointFileData || '[]',
  ) as Checkpoint<T>[];

  if (savedCheckpoint?.length === 0) {
    savedCheckpoint = (await getInitialData()).map((item) => {
      return {
        id: getCheckpointId(item),
        params: item,
        completed: false,
      } satisfies Checkpoint<T>;
    });

    writeFileSync(filePath, JSON.stringify(savedCheckpoint, null, 2), 'utf-8');
  }

  let filteredCheckpoint: Checkpoint<T>[] = [];

  if (forceAll) {
    filteredCheckpoint = savedCheckpoint;
  } else if (forceCheckpointId.length > 0) {
    filteredCheckpoint = savedCheckpoint.filter((checkpoint) => {
      return forceCheckpointId.includes(checkpoint.id);
    });
  } else if (filterCheckpoint) {
    filteredCheckpoint = savedCheckpoint.filter(filterCheckpoint);
  } else {
    filteredCheckpoint = savedCheckpoint.filter((checkpoint) => {
      return !checkpoint.completed;
    });
  }

  if (sortCheckpoint) {
    filteredCheckpoint.sort(sortCheckpoint);
  }

  return {
    filteredCheckpoint,
    getAllCheckpoint: () => {
      return savedCheckpoint;
    },
    setCheckpointComplete: (checkpointId, completed) => {
      const idx = savedCheckpoint.findIndex(
        (checkpoint) => checkpointId === checkpoint.id,
      );

      if (idx !== -1) {
        savedCheckpoint[idx]!.completed = completed;

        writeFileSync(
          filePath,
          JSON.stringify(savedCheckpoint, null, 2),
          'utf-8',
        );
      } else {
        logger.error(
          `Checkpoint with id ${checkpointId} not found in saved checkpoints.`,
        );
      }
    },
  };
};

export { withCheckpoint };
