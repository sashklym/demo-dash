import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

/**
 * Single axios instance for the whole app. The generated client (orval) calls
 * `apiClient` for every request — no HTTP is ever hand-written elsewhere.
 */
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});

export const apiClient = <T>(config: AxiosRequestConfig): Promise<T> =>
  axiosInstance(config).then((response) => response.data);

// Types referenced by the generated client.
export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
