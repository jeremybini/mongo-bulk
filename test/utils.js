const ERROR_WAS_THROWN = 'ERROR_WAS_THROWN';

export async function expectAsyncError(promise) {
  let result;

  try {
    result = await promise;
  } catch (error) {
    result = ERROR_WAS_THROWN;
  }

  if (result !== ERROR_WAS_THROWN) {
    throw new Error(`Error was not thrown. Promise resolved with result ${JSON.stringify(result)}`);
  }
}
