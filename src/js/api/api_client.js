import {ApiConnection} from '../mtproto/api_connection.js';

const ApiClient = new ApiConnection();

window.ApiClient = ApiClient;

export {ApiClient};
