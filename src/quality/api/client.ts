/**
 * Backend API Client for LLT Quality Analysis
 *
 * ✨ Refactored to use BaseBackendClient
 */

import { BaseBackendClient } from '../../api/baseBackendClient';
import {
	AnalyzeQualityRequest,
	AnalyzeQualityResponse,
	BackendError
} from './types';
import { QUALITY_DEFAULTS } from '../utils/constants';

/**
 * Quality Backend Client
 *
 * Inherits from BaseBackendClient for standardized error handling,
 * health checks, and request management.
 */
export class QualityBackendClient extends BaseBackendClient {
	constructor() {
		// Initialize base client with feature-specific settings
		super({
			featureName: 'Quality',
			timeout: 30000, // 30 seconds
			enableRequestId: true
		});
	}

	/**
	 * Analyze test files for quality issues
	 *
	 * POST /quality/analyze
	 */
	async analyzeQuality(request: AnalyzeQualityRequest): Promise<AnalyzeQualityResponse> {
		// Log full request payload
		console.log('[LLT Quality API] ====================================================================');
		console.log('[LLT Quality API] Request Payload:');
		console.log('[LLT Quality API] -------------------------------------------------------------------');
		console.log(`[LLT Quality API] Files count: ${request.files.length}`);
		console.log(`[LLT Quality API] Mode: ${request.mode}`);
		console.log(`[LLT Quality API] Config:`, JSON.stringify(request.config, null, 2));
		console.log('[LLT Quality API] Sample file paths:');
		request.files.slice(0, 3).forEach(file => console.log(`[LLT Quality API]   - ${file.path}`));
		if (request.files.length > 3) {
			console.log(`[LLT Quality API]   ... and ${request.files.length - 3} more files`);
		}
		console.log('[LLT Quality API] ====================================================================');

		try {
			// Use BaseBackendClient's executeWithRetry for standardized retry logic
			const response = await this.executeWithRetry(
				async () => {
					const res = await this.client.post<AnalyzeQualityResponse>(
						'/quality/analyze',
						request
					);
					return res.data;
				},
				QUALITY_DEFAULTS.RETRY_MAX_ATTEMPTS,
				QUALITY_DEFAULTS.RETRY_BASE_DELAY_MS
			);

			// Log full response
			console.log('[LLT Quality API] ====================================================================');
			console.log('[LLT Quality API] Response Data:');
			console.log('[LLT Quality API] -------------------------------------------------------------------');
			console.log(`[LLT Quality API] Analysis ID: ${response.analysis_id}`);
			console.log(`[LLT Quality API] Issues found: ${response.issues.length}`);
			console.log(`[LLT Quality API] Summary:`, JSON.stringify(response.summary, null, 2));
			if (response.issues.length > 0) {
				console.log('[LLT Quality API] Sample issues:');
				response.issues.slice(0, 2).forEach(issue => {
					console.log(`[LLT Quality API]   - ${issue.severity.toUpperCase()}: ${issue.file}:${issue.line} - ${issue.message}`);
				});
				if (response.issues.length > 2) {
					console.log(`[LLT Quality API]   ... and ${response.issues.length - 2} more issues`);
				}
			}
			console.log('[LLT Quality API] ====================================================================');

			return response;
		} catch (error: any) {
			// Convert BaseBackendClient errors to Quality BackendError format
			throw this.convertToQualityError(error);
		}
	}

	/**
	 * Convert BaseBackendClient errors to Quality BackendError format
	 * Maintains backward compatibility with existing error handling
	 */
	private convertToQualityError(error: any): BackendError {
		// If it's already a BackendError from BaseBackendClient
		if (error.name === 'BackendError') {
			return {
				type: error.type,
				message: error.message,
				detail: error.detail,
				statusCode: error.statusCode
			};
		}

		// Unknown error
		return {
			type: 'unknown',
			message: error.message || 'Unknown error',
			detail: error.detail || String(error),
			statusCode: error.statusCode
		};
	}
}
