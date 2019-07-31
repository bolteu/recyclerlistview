/**
 * Created by ananya.chandra on 14/09/18.
 */

import * as React from "react";
import * as PropTypes from "prop-types";
import { StyleProp, View, ViewStyle } from "react-native";
import RecyclerListView, { RecyclerListViewState, RecyclerListViewProps } from "./RecyclerListView";
import { ScrollEvent } from "./scrollcomponent/BaseScrollView";
import StickyObject, { StickyObjectProps } from "./sticky/StickyObject";
import StickyHeader from "./sticky/StickyHeader";
import StickyFooter from "./sticky/StickyFooter";
import CustomError from "./exceptions/CustomError";
import RecyclerListViewExceptions from "./exceptions/RecyclerListViewExceptions";
import { Layout } from "./layoutmanager/LayoutManager";
import { BaseLayoutProvider, Dimension } from "./dependencies/LayoutProvider";
import { BaseDataProvider } from "./dependencies/DataProvider";
import { ReactElement } from "react";
import { ComponentCompat } from "../utils/ComponentCompat";

export interface StickyContainerProps {
    children: RecyclerChild;
    stickyHeaderIndices?: number[];
    stickyFooterIndices?: number[];
    overrideRowRenderer?: (type: string | number | undefined, data: any, index: number, extendedState?: object) => JSX.Element | JSX.Element[] | null;
    style?: StyleProp<ViewStyle>;
}
export interface RecyclerChild extends React.ReactElement<RecyclerListViewProps> {
    ref: (recyclerRef: any) => {};
    props: RecyclerListViewProps;
}
export default class StickyContainer<P extends StickyContainerProps> extends ComponentCompat<P> {
    public static propTypes = {};
    private _recyclerRef: RecyclerListView<RecyclerListViewProps, RecyclerListViewState> | undefined = undefined;
    private _dataProvider: BaseDataProvider;
    private _layoutProvider: BaseLayoutProvider;
    private _extendedState: object | undefined;
    private _rowRenderer: ((type: string | number, data: any, index: number, extendedState?: object) => JSX.Element | JSX.Element[] | null);
    private _distanceFromWindow: number;

    private _stickyHeaderRef: StickyHeader<StickyObjectProps> | null = null;
    private _stickyFooterRef: StickyFooter<StickyObjectProps> | null = null;
    private _visibleIndicesAll: number[] = [];

    constructor(props: P, context?: any) {
        super(props, context);
        this._assertChildType();
        const childProps: RecyclerListViewProps = props.children.props;
        this._dataProvider = childProps.dataProvider;
        this._layoutProvider = childProps.layoutProvider;
        this._extendedState = childProps.extendedState;
        this._rowRenderer = childProps.rowRenderer;
        this._distanceFromWindow = childProps.distanceFromWindow ? childProps.distanceFromWindow : 0;
    }

    public componentWillReceivePropsCompat(newProps: P): void {
        this._initParams(newProps);
    }

    public render(): JSX.Element {
        this._assertChildType();
        const recycler: ReactElement<RecyclerListViewProps> = React.cloneElement(this.props.children, {
            ...this.props.children.props,
            ref: this._getRecyclerRef,
            onVisibleIndicesChanged: this._onVisibleIndicesChanged,
            onScroll: this._onScroll,
        });
        return (
            <View style={this.props.style ? this.props.style : { flex: 1 }}>
                {recycler}
                {this.props.stickyHeaderIndices ? (
                    <StickyHeader ref={(stickyHeaderRef: any) => this._getStickyHeaderRef(stickyHeaderRef)}
                        stickyIndices={this.props.stickyHeaderIndices}
                        getLayoutForIndex={this._getLayoutForIndex}
                        getDataForIndex={this._getDataForIndex}
                        getLayoutTypeForIndex={this._getLayoutTypeForIndex}
                        getExtendedState={this._getExtendedState}
                        getRLVRenderedSize={this._getRLVRenderedSize}
                        getContentDimension={this._getContentDimension}
                        getRowRenderer={this._getRowRenderer}
                        getDistanceFromWindow={this._getDistanceFromWindow}
                        overrideRowRenderer={this.props.overrideRowRenderer} />
                ) : null}
                {this.props.stickyFooterIndices ? (
                    <StickyFooter ref={(stickyFooterRef: any) => this._getStickyFooterRef(stickyFooterRef)}
                        stickyIndices={this.props.stickyFooterIndices}
                        getLayoutForIndex={this._getLayoutForIndex}
                        getDataForIndex={this._getDataForIndex}
                        getLayoutTypeForIndex={this._getLayoutTypeForIndex}
                        getExtendedState={this._getExtendedState}
                        getRLVRenderedSize={this._getRLVRenderedSize}
                        getContentDimension={this._getContentDimension}
                        getRowRenderer={this._getRowRenderer}
                        getDistanceFromWindow={this._getDistanceFromWindow}
                        overrideRowRenderer={this.props.overrideRowRenderer} />
                ) : null}
            </View>
        );
    }

    private _getRecyclerRef = (recycler: any) => {
        this._recyclerRef = recycler as (RecyclerListView<RecyclerListViewProps, RecyclerListViewState> | undefined);
        if (this.props.children.ref) {
            if (typeof this.props.children.ref === "function") {
                (this.props.children).ref(recycler);
            } else {
                throw new CustomError(RecyclerListViewExceptions.refNotAsFunctionException);
            }
        }
    }

    private _getStickyHeaderRef = (stickyHeaderRef: any) => {
        if (this._stickyHeaderRef !== stickyHeaderRef) {
            this._stickyHeaderRef = stickyHeaderRef as (StickyHeader<StickyObjectProps> | null);
            // TODO: Resetting state once ref is initialized. Can look for better solution.
            this._callStickyObjectsOnVisibleIndicesChanged(this._visibleIndicesAll);
        }
    }

    private _getStickyFooterRef = (stickyFooterRef: any) => {
        if (this._stickyFooterRef !== stickyFooterRef) {
            this._stickyFooterRef = stickyFooterRef as (StickyFooter<StickyObjectProps> | null);
            // TODO: Resetting state once ref is initialized. Can look for better solution.
            this._callStickyObjectsOnVisibleIndicesChanged(this._visibleIndicesAll);
        }
    }

    private _onVisibleIndicesChanged = (all: number[], now: number[], notNow: number[]) => {
        this._visibleIndicesAll = all;
        this._callStickyObjectsOnVisibleIndicesChanged(all);
        if (this.props.children && this.props.children.props && this.props.children.props.onVisibleIndicesChanged) {
            this.props.children.props.onVisibleIndicesChanged(all, now, notNow);
        }
    }

    private _callStickyObjectsOnVisibleIndicesChanged = (all: number[]) => {
        if (this._stickyHeaderRef) {
            this._stickyHeaderRef.onVisibleIndicesChanged(all);
        }
        if (this._stickyFooterRef) {
            this._stickyFooterRef.onVisibleIndicesChanged(all);
        }
    }

    private _onScroll = (rawEvent: ScrollEvent, offsetX: number, offsetY: number) => {
        if (this._stickyHeaderRef) {
            this._stickyHeaderRef.onScroll(offsetY);
        }
        if (this._stickyFooterRef) {
            this._stickyFooterRef.onScroll(offsetY);
        }
        if (this.props.children && this.props.children.props.onScroll) {
            this.props.children.props.onScroll(rawEvent, offsetX, offsetY);
        }
    }

    private _assertChildType = (): void => {
        if (React.Children.count(this.props.children) !== 1 || !this._isChildRecyclerInstance()) {
            throw new CustomError(RecyclerListViewExceptions.wrongStickyChildTypeException);
        }
    }

    private _isChildRecyclerInstance = (): boolean => {
        return (
            this.props.children.props.dataProvider
            && this.props.children.props.rowRenderer
            && this.props.children.props.layoutProvider
        );
    }

    private _getLayoutForIndex = (index: number): Layout | undefined => {
        if (this._recyclerRef) {
            return this._recyclerRef.getLayout(index);
        }
        return undefined;
    }

    private _getDataForIndex = (index: number): any => {
        return this._dataProvider.getDataForIndex(index);
    }

    private _getLayoutTypeForIndex = (index: number): string | number => {
        return this._layoutProvider.getLayoutTypeForIndex(index);
    }

    private _getExtendedState = (): object | undefined => {
        return this._extendedState;
    }

    private _getRowRenderer = (): ((type: string | number, data: any, index: number, extendedState?: object)
        => JSX.Element | JSX.Element[] | null) => {
        return this._rowRenderer;
    }

    private _getRLVRenderedSize = (): Dimension | undefined => {
        if (this._recyclerRef) {
            return this._recyclerRef.getRenderedSize();
        }
        return undefined;
    }

    private _getContentDimension = (): Dimension | undefined => {
        if (this._recyclerRef) {
            return this._recyclerRef.getContentDimension();
        }
        return undefined;
    }

    private _getDistanceFromWindow = (): number => {
        return this._distanceFromWindow;
    }

    private _initParams = (props: P) => {
        const childProps: RecyclerListViewProps = props.children.props;
        this._dataProvider = childProps.dataProvider;
        this._layoutProvider = childProps.layoutProvider;
        this._extendedState = childProps.extendedState;
        this._rowRenderer = childProps.rowRenderer;
        this._distanceFromWindow = childProps.distanceFromWindow ? childProps.distanceFromWindow : 0;
    }
}

StickyContainer.propTypes = {

    // Mandatory to pass a single child of RecyclerListView or any of its children classes. Exception will be thrown otherwise.
    children: PropTypes.element.isRequired,

    // Provide an array of indices whose corresponding items need to be stuck to the top of the recyclerView once the items scroll off the top.
    // Every subsequent sticky index view will push the previous sticky view off the top to take its place.
    // Note - Needs to be sorted ascending
    stickyHeaderIndices: PropTypes.arrayOf(PropTypes.number),

    // Works same as sticky headers, but for views to be stuck at the bottom of the recyclerView.
    // Note - Needs to be sorted ascending
    stickyFooterIndices: PropTypes.arrayOf(PropTypes.number),

    // Will be called instead of rowRenderer for all sticky items. Any changes to the item for when they are stuck can be done here.
    overrideRowRenderer: PropTypes.func,

    // For all practical purposes, pass the style that is applied to the RecyclerListView component here.
    style: PropTypes.object,
};
